import { chromium, expect } from "@playwright/test";
import { Buffer } from "node:buffer";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import process from "node:process";
import sharp from "sharp";
import { captureBuilder } from "./help-screenshots/builder.mjs";
import { captureOptimizer } from "./help-screenshots/optimizer.mjs";
import { captureLibraryAndProgression } from "./help-screenshots/libraryAndProgression.mjs";

// Uses isolated browser storage and the real local API; never reads user builds.
const baseURL = process.env.HELP_SCREENSHOT_URL || "http://127.0.0.1:5173";
const output = new URL("../src/assets/help/", import.meta.url);
const manifestPath = new URL(
    "../src/features/help/content/screenshotDimensions.json",
    import.meta.url
);
await mkdir(output, { recursive: true });
const dimensions = {};
sharp.cache(false);
for (const file of await readdir(output)) {
    if (!file.endsWith(".webp")) continue;
    const { width, height } = await sharp(fileURLToPath(new URL(file, output))).metadata();
    dimensions[file] = { width, height };
}
const browser = await chromium.launch();
const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2,
    reducedMotion: "reduce",
    baseURL,
});
const page = await context.newPage();
const setLanguage = async (language) => {
    await page.evaluate((value) => {
        const key = "broken-ranks-tool.language.v1";
        localStorage.setItem(key, value);
        window.dispatchEvent(new StorageEvent("storage", { key, newValue: value }));
    }, language);
    await expect(page.locator("html")).toHaveAttribute("lang", language);
};
const fixture = async (name) =>
    JSON.parse(
        await readFile(new URL("../src/test/fixtures/builds/" + name, import.meta.url), "utf8")
    );
const importBuild = async (payload) => {
    await page.goto("/builder?ui=desktop&slot=helmet");
    await expect(page.locator(".character-summary")).toBeVisible();
    await page
        .locator('input[type="file"]')
        .first()
        .setInputFiles({
            name: "example-build.json",
            mimeType: "application/json",
            buffer: Buffer.from(JSON.stringify(payload)),
        });
    await expect(page.getByText(/Wczytano build z pliku/)).toBeVisible();
};
const capture = async (
    name,
    locator,
    { lastContent, maxHeight = 900, maxWidth, viewportWidth } = {}
) => {
    const filter = process.env.HELP_SCREENSHOT_FILTER?.split(",");
    if (filter && !filter.includes(name)) return;
    if (viewportWidth) await page.setViewportSize({ width: viewportWidth, height: 1080 });
    for (const language of ["pl", "en"]) {
        const file = name + "-" + language + ".webp";
        if (dimensions[file] && !process.env.HELP_SCREENSHOT_OVERWRITE) continue;
        await setLanguage(language);
        await expect(locator).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        await page.evaluate(
            () =>
                new Promise((resolve) =>
                    requestAnimationFrame(() => requestAnimationFrame(resolve))
                )
        );
        const buffer = await locator.screenshot({ animations: "disabled" });
        const contentHeight = lastContent
            ? await locator.evaluate((element, selector) => {
                  const last = [...element.querySelectorAll(selector)].at(-1);
                  if (!last) throw new Error("No screenshot boundary: " + selector);
                  return Math.ceil(
                      last.getBoundingClientRect().bottom - element.getBoundingClientRect().top + 12
                  );
              }, lastContent)
            : maxHeight;
        const asset = sharp(buffer);
        const metadata = await asset.metadata();
        const { data, info } = await asset
            .extract({
                left: 0,
                top: 0,
                width: Math.min(metadata.width, maxWidth ? maxWidth * 2 : metadata.width),
                height: Math.min(metadata.height, contentHeight * 2, maxHeight * 2),
            })
            .webp({ quality: 85 })
            .toBuffer({ resolveWithObject: true });
        const stats = await sharp(data).stats();
        if (stats.channels[0].stdev < 1) throw new Error("Blank screenshot: " + file);
        await writeFile(new URL(file, output), data);
        dimensions[file] = { width: info.width, height: info.height };
        await writeFile(manifestPath, JSON.stringify(dimensions, null, 4) + "\n");
        console.log(file + ": " + info.width + "×" + info.height + ", " + info.size + " B");
    }
    await setLanguage("pl");
    if (viewportWidth) await page.setViewportSize({ width: 1920, height: 1080 });
};
try {
    const catalogResponse = await context.request.get("/api/initial-data");
    expect(catalogResponse.ok(), "Start the real local API before capturing").toBeTruthy();
    const catalog = await catalogResponse.json();
    const helpers = { page, context, catalog, capture, importBuild, fixture };
    const sections = {
        builder: captureBuilder,
        optimizer: captureOptimizer,
        library: captureLibraryAndProgression,
    };
    for (const name of process.argv.slice(2).length
        ? process.argv.slice(2)
        : Object.keys(sections)) {
        if (!sections[name]) throw new Error("Unknown screenshot section: " + name);
        console.log("Capturing " + name);
        await sections[name](helpers);
    }
} catch (error) {
    await page.screenshot({ path: "../tmp/help-capture-error.png" }).catch(() => {});
    console.error(await page.locator('[role="alert"], .app-notice').allTextContents());
    throw error;
} finally {
    await browser.close();
}
