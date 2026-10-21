import { expect, test } from "@playwright/test";
import { mobileDevice } from "./mobile-device";
import {
    optimizerBuild,
    optimizerCatalog,
} from "../src/test/fixtures/equipment/optimizerScenario.js";

test.use(mobileDevice);

const luminance = (color) => {
    const channels = color
        .match(/[\d.]+/g)
        .slice(0, 3)
        .map(Number)
        .map((value) => {
            const normalized = value / 255;
            return normalized <= 0.04045
                ? normalized / 12.92
                : ((normalized + 0.055) / 1.055) ** 2.4;
        });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
};

test("mobile dropdown options stay readable and selectable in every optimizer mode", async ({
    page,
}) => {
    await page.setViewportSize({ width: 320, height: 844 });
    await page.addInitScript(
        (build) =>
            localStorage.setItem(
                "broken-ranks-tool.equipment-draft.v3",
                JSON.stringify({ version: 3, value: { ...build, backpack: [] } })
            ),
        optimizerBuild
    );
    await page.route("**/api/initial-data", (route) => route.fulfill({ json: optimizerCatalog }));
    await page.route("**/api/calculator/calculate", (route) =>
        route.fulfill({ json: { stats: { CRITICAL_CHANCE: "12%", MANA_USAGE_REDUCTION: "-10%" } } })
    );
    await page.goto("/optimizer?ui=mobile");
    const mode = page.getByLabel("Tryb optymalizatora", { exact: true });
    await mode.waitFor();
    for (const value of ["SIMPLE", "ADVANCED", "REORGANIZE", "ADVISOR"]) {
        await mode.selectOption(value);
        await expect(mode).toHaveValue(value);
        const options = await page
            .locator(".mobile-header select option, .mobile-optimizer select option")
            .evaluateAll((elements) =>
                elements.map((element) => {
                    const style = getComputedStyle(element);
                    return {
                        label: element.textContent,
                        color: style.color,
                        background: style.backgroundColor,
                    };
                })
            );
        expect(options.length).toBeGreaterThanOrEqual(6);
        for (const option of options) {
            expect(
                option.background,
                `${value}: ${option.label} must have an opaque background`
            ).not.toMatch(/rgba\(.+, 0\)$/);
            const foreground = luminance(option.color);
            const background = luminance(option.background);
            const contrast =
                (Math.max(foreground, background) + 0.05) /
                (Math.min(foreground, background) + 0.05);
            expect(contrast, `${value}: ${option.label} text contrast`).toBeGreaterThanOrEqual(4.5);
        }
    }
    await page.getByLabel("Nazwy modów", { exact: true }).selectOption("DRIFS");
    await expect(page.getByLabel("Główny cel")).toContainText("Band");
    expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    ).toBe(true);
});
