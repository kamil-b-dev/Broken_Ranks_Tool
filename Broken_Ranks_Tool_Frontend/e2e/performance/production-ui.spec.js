import { expect, test, devices } from "@playwright/test";
import { Buffer } from "node:buffer";
import { builderCatalog as catalog } from "../../src/test/fixtures/equipment/builderCatalog.js";

const mockData = async (page) => {
    await page.route("**/api/initial-data", (route) => route.fulfill({ json: catalog }));
    await page.route("**/api/calculator/calculate", (route) =>
        route.fulfill({ json: { stats: { Siła: 42 } } })
    );
};
const resources = (page) =>
    page.evaluate(() =>
        performance
            .getEntriesByType("resource")
            .filter((entry) => !entry.name.includes("/api/"))
            .map((entry) => ({ name: entry.name.split("/").pop(), bytes: entry.decodedBodySize }))
    );

test("mobile production startup obeys route budgets and defers other workspaces", async ({
    browser,
}) => {
    for (const [route, maximum] of [
        ["/", 650_000],
        ["/kreator", 1_000_000],
        ["/optymalizator", 1_100_000],
    ]) {
        const context = await browser.newContext(devices["Pixel 7"]);
        const page = await context.newPage();
        await mockData(page);
        await page.goto(route);
        await expect(page.locator(".mobile-app")).toBeVisible();
        if (route !== "/")
            await expect(page.locator("#workspace-content")).not.toHaveClass(/workspace-state/);
        await page.waitForLoadState("networkidle");
        const loaded = await resources(page);
        expect(
            loaded.reduce((sum, entry) => sum + entry.bytes, 0),
            JSON.stringify(loaded)
        ).toBeLessThan(maximum);
        expect(loaded.some(({ name }) => name.includes("DesktopApp"))).toBe(false);
        if (route === "/")
            expect(
                loaded.some(({ name }) =>
                    /MobileBuilderWorkspace|BuildLibraryWorkspace|MobileOptimizerWorkspace/.test(
                        name
                    )
                )
            ).toBe(false);
        await context.close();
    }
});

test("desktop production keeps one editor and bounds large database results", async ({ page }) => {
    await page.route("**/api/initial-data", (route) =>
        route.fulfill({
            json: {
                ...catalog,
                items: Array.from({ length: 1500 }, (_, index) => ({
                    ...catalog.items[0],
                    id: index + 100,
                    name: `Hełm ${String(index).padStart(4, "0")}`,
                })),
            },
        })
    );
    await page.goto("/kreator");
    await expect(page.locator(".gear-slot-editor")).toHaveCount(1);
    await expect(page.locator(".database-result-row")).toHaveCount(60);
    await page.getByRole("button", { name: "Następna", exact: true }).click();
    await expect(page.locator(".database-result-row").first()).toContainText("0060");
    await page.getByRole("textbox", { name: "Wyszukaj przedmioty" }).fill("1499");
    await expect(page.locator(".database-result-row")).toHaveCount(1);
    await page.waitForLoadState("networkidle");
    const loaded = await resources(page);
    expect(
        loaded.reduce((sum, entry) => sum + entry.bytes, 0),
        JSON.stringify(loaded)
    ).toBeLessThan(2_600_000);
    expect(loaded.some(({ name }) => /OptimizerWorkspace|BuildLibraryWorkspace/.test(name))).toBe(
        false
    );
});

test("mobile editor preserves import calculations and provisional level edits", async ({
    browser,
}) => {
    const context = await browser.newContext(devices["Pixel 7"]);
    const page = await context.newPage();
    await mockData(page);
    await page.goto("/kreator?slot=helmet");
    await expect(
        page.getByRole("button", { name: "Wybierz przedmiot", exact: true })
    ).toBeVisible();
    const payload = {
        format: "broken-ranks-tool-build",
        version: 1,
        build: {
            requestData: {
                slots: {
                    helmet: {
                        itemId: 1,
                        itemStars: 1,
                        drifIds: [],
                        drifLevels: {},
                        orbIds: [],
                        orbLevels: [],
                    },
                },
                characterStats: {},
            },
            characterConfig: { level: 140, spentPoints: { Siła: 5 } },
            lockedSlots: [],
            lockedDrifs: {},
        },
    };
    await page.locator('input[type="file"]').setInputFiles({
        name: "regression.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(payload)),
    });
    await expect(page.getByRole("status").filter({ hasText: "Wczytano build" })).toBeVisible();
    await page.getByRole("button", { name: /Wszystkie sloty/ }).tap();
    await page.getByRole("button", { name: "Statystyki", exact: true }).tap();
    await expect(page.getByRole("definition").filter({ hasText: "42" })).toBeVisible();
    await page.getByRole("button", { name: "Postać", exact: true }).tap();
    const level = page.getByLabel("Poziom postaci");
    await level.focus();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.press("Backspace");
    await page.keyboard.type("140");
    await level.blur();
    await expect(page.locator(".mobile-character-stat").filter({ hasText: "Siła" })).toContainText(
        "5 pkt"
    );
    await context.close();
});

test("mobile stone controls never fetch hidden category artwork", async ({ browser }) => {
    const context = await browser.newContext(devices["Pixel 7"]);
    const page = await context.newPage();
    await mockData(page);
    await page.goto("/kreator?slot=helmet");
    await page.getByRole("button", { name: "Wybierz przedmiot", exact: true }).tap();
    await page.getByRole("button", { name: /Hełm podróżnika/ }).tap();
    await page
        .getByRole("dialog")
        .getByRole("button", { name: "Wybierz przedmiot", exact: true })
        .tap();
    await page.getByLabel("Wybierz rodzaj drifa 1", { exact: true }).selectOption("Band");
    await page.getByLabel("Wybierz wielkość drifa 1", { exact: true }).selectOption("60");
    await page.getByLabel("Wybierz rodzaj orba").selectOption("Ochrona");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(".mobile-stones img")).toHaveCount(0);
    expect(
        (await resources(page)).some(({ name }) => /drif-offensive|orb-defensive/.test(name))
    ).toBe(false);
    await context.close();
});
