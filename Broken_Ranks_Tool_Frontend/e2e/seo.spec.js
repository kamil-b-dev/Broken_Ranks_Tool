import { devices, expect, test } from "@playwright/test";
import { SITE_PAGES } from "../src/app/seo/pages.js";
import { builderCatalog } from "../src/test/fixtures/equipment/builderCatalog.js";

test("serves unique titles, canonicals and useful content without executing JavaScript", async ({
    browser,
    request,
}) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    try {
        for (const entry of SITE_PAGES) {
            const response = await page.goto(`http://127.0.0.1:4173${entry.path}`);
            expect(response.status()).toBe(200);
            await expect(page).toHaveTitle(entry.title);
            await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
                "href",
                `https://www.brokenrankstool.pl${entry.path}`
            );
            await expect(page.getByRole("heading", { level: 1 })).toHaveText(entry.heading);
            await expect(page.getByText(entry.description)).toBeVisible();
        }
        const sitemap = await request.get("/sitemap.xml");
        expect(sitemap.status()).toBe(200);
        expect(sitemap.headers()["content-type"]).toContain("xml");
        const xml = await sitemap.text();
        for (const entry of SITE_PAGES.filter((entry) => !entry.noindex))
            expect(xml).toContain(`https://www.brokenrankstool.pl${entry.path}</loc>`);
        expect(xml).not.toContain("/builds");
        const robots = await request.get("/robots.txt");
        expect(robots.status()).toBe(200);
        expect(await robots.text()).toContain(
            "Sitemap: https://www.brokenrankstool.pl/sitemap.xml"
        );
    } finally {
        await context.close();
    }
});

test("updates metadata when navigating to help and back, including language changes", async ({
    page,
}) => {
    await page.route("**/api/initial-data", (route) => route.fulfill({ json: builderCatalog }));
    await page.route("**/api/calculator/calculate", (route) =>
        route.fulfill({ json: { stats: {} } })
    );
    await page.goto("/");
    await expect(page.getByText(SITE_PAGES[0].description)).toBeVisible();
    await page.getByRole("button", { name: "EN — English" }).click();
    await expect(page).toHaveTitle("Broken Ranks Tool – equipment calculator and drif optimizer");
    await expect(page.locator('a[href="/builder"]').first()).not.toHaveAttribute(
        "aria-disabled",
        "true"
    );
    await page.locator('a[href="/builder"]').first().click();
    await expect(page).toHaveTitle("Equipment calculator and build planner – Broken Ranks Tool");
    await page.locator('a[href^="/help"]').first().click();
    await expect(page).toHaveURL(/\/help/);
    await expect(page).toHaveTitle("Calculator and optimizer guide – Broken Ranks Tool");
    await page.goBack();
    await expect(page).toHaveTitle("Equipment calculator and build planner – Broken Ranks Tool");
});

for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
]) {
    test(`home description fits the ${viewport.width}px layout`, async ({ browser }, testInfo) => {
        const mobile = viewport.width < 600;
        const context = await browser.newContext(
            mobile ? { ...devices["Pixel 7"], viewport } : { viewport }
        );
        const page = await context.newPage();
        try {
            await page.route("**/api/initial-data", (route) =>
                route.fulfill({ json: builderCatalog })
            );
            await page.goto("http://127.0.0.1:4173/");
            await expect(page.locator(".home-description")).toHaveText(SITE_PAGES[0].description);
            await expect(page.locator(mobile ? ".mobile-app" : ".app-shell")).toBeVisible();
            await expect(page.getByRole("button", { name: "Utwórz build" })).toBeVisible();
            await page.waitForLoadState("networkidle");
            expect(
                await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
            ).toBe(true);
            await page.screenshot({
                path: testInfo.outputPath("home.png"),
                fullPage: true,
                animations: "disabled",
                scale: "css",
            });
            await page
                .locator(".home-intro")
                .screenshot({ path: testInfo.outputPath("intro.png"), scale: "css" });
        } finally {
            await context.close();
        }
    });
}
