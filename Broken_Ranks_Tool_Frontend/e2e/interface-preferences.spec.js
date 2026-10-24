import { expect, test } from "./fixtures/test.js";
import { builderCatalog } from "../src/test/fixtures/equipment/builderCatalog.js";

for (const [layout, width] of [
    ["desktop", 1800],
    ["mobile", 390],
    ["mobile", 320],
]) {
    test(`${layout} ${width}px header switches languages and preserves the current build`, async ({
        page,
    }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.route("**/api/initial-data", (route) => route.fulfill({ json: builderCatalog }));
        await page.route("**/api/calculator/calculate", (route) =>
            route.fulfill({ json: { stats: {} } })
        );
        await page.goto(`/builder?ui=${layout}`);
        const preferences = page.locator("header .interface-preferences");
        const naming = preferences.getByRole("combobox", { name: "Nazwy modów" });
        await naming.selectOption("DRIFS");
        if (layout === "mobile")
            await page.getByRole("button", { name: "Postać", exact: true }).click();
        const level = page.getByRole("spinbutton", { name: "Poziom postaci", exact: true });
        await level.fill("77");
        await level.press("Tab");
        await preferences.getByRole("button", { name: "EN — English", exact: true }).press("Enter");
        await expect(page.locator("html")).toHaveAttribute("lang", "en");
        await expect(preferences.getByRole("combobox", { name: "Modifier labels" })).toHaveValue(
            "DRIFS"
        );
        await expect(
            page.getByRole("spinbutton", { name: "Character level", exact: true })
        ).toHaveValue("77");
        await preferences.getByRole("button", { name: "PL — Polski", exact: true }).press("Enter");
        await expect(page.locator("html")).toHaveAttribute("lang", "pl");
        await expect(level).toHaveValue("77");
        await preferences.getByRole("button", { name: "EN — English", exact: true }).press("Enter");
        await page.reload();
        await expect(preferences.getByRole("combobox", { name: "Modifier labels" })).toHaveValue(
            "DRIFS"
        );
        await expect(
            preferences.getByRole("button", { name: "EN — English", exact: true })
        ).toHaveAttribute("aria-pressed", "true");
        const controls = await preferences.locator("button, select").evaluateAll((elements) =>
            elements.map((element) => ({
                width: element.getBoundingClientRect().width,
                height: element.getBoundingClientRect().height,
                font: getComputedStyle(element).fontFamily,
            }))
        );
        expect(controls).toHaveLength(3);
        for (const control of controls) {
            expect(control.width).toBeGreaterThanOrEqual(36);
            expect(control.height).toBeGreaterThanOrEqual(layout === "mobile" ? 44 : 34);
            expect(control.font).toContain("Inter");
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
            true
        );
    });
}
