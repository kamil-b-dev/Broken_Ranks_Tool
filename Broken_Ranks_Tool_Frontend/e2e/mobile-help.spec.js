import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mobileDevice } from "./mobile-device";
import { builderCatalog } from "../src/test/fixtures/equipment/builderCatalog.js";

test.beforeEach(async ({ page }) => {
    await page.route("**/api/initial-data", (route) => route.fulfill({ json: builderCatalog }));
    await page.route("**/api/calculator/calculate*", (route) =>
        route.fulfill({ json: { stats: {} } })
    );
});

test.describe("desktop help", () => {
    test.use({ viewport: { width: 1440, height: 1000 } });
    test("opens a side panel, restores focus and retains the builder through help navigation", async ({
        page,
        browserName,
    }, testInfo) => {
        test.skip(browserName !== "chromium", "Desktop presentation is checked in Chromium.");
        await page.goto("/builder?ui=desktop");
        const opener = page.getByRole("link", { name: "Jak korzystać?", exact: true });
        await opener.click();
        const dialog = page.getByRole("dialog", { name: "Ekwipunek", exact: true });
        await expect(dialog).toBeVisible();
        await expect(dialog).toHaveCSS("width", "480px");
        await page.screenshot({ path: testInfo.outputPath("help-desktop-panel.png") });
        expect(
            (
                await new AxeBuilder({ page })
                    .include(".help-dialog")
                    .withTags(["wcag2a", "wcag2aa"])
                    .analyze()
            ).violations
        ).toEqual([]);
        await page.keyboard.press("Escape");
        await expect(dialog).toHaveCount(0);
        await expect(opener).toBeFocused();
        await page.getByRole("link", { name: "Instrukcja", exact: true }).click();
        await expect(page).toHaveURL(/\/help\?topic=builder$/);
        await page
            .getByRole("navigation", { name: "Tematy pomocy" })
            .locator("summary")
            .filter({ hasText: /^Doradca$/ })
            .click();
        await page
            .getByRole("navigation", { name: "Tematy pomocy" })
            .getByRole("link", { name: "Jak korzystać z Doradcy?", exact: true })
            .click();
        await expect(page.getByRole("heading", { name: "Jak korzystać z Doradcy?" })).toBeVisible();
        await page.screenshot({ path: testInfo.outputPath("help-desktop-page.png") });
        expect(
            (
                await new AxeBuilder({ page })
                    .include(".help-page")
                    .withTags(["wcag2a", "wcag2aa"])
                    .analyze()
            ).violations
        ).toEqual([]);
        await page.goBack();
        await expect(page).toHaveURL(/\/builder\?ui=desktop$/);
        await expect(opener).toBeVisible();
    });
});

test.describe("mobile help", () => {
    test.use(mobileDevice);
    test("keeps the selected item and slot through contextual and full page help at 320px", async ({
        page,
    }, testInfo) => {
        await page.goto("/builder?slot=helmet");
        await page.getByRole("button", { name: "Wybierz przedmiot", exact: true }).tap();
        await page.getByRole("button", { name: /Hełm podróżnika/ }).tap();
        await page
            .getByRole("dialog")
            .getByRole("button", { name: "Wybierz przedmiot", exact: true })
            .tap();
        await expect(page.getByRole("heading", { name: "Hełm podróżnika" })).toBeVisible();
        await page.setViewportSize({ width: 320, height: 740 });
        await expect(page.locator("html")).toHaveJSProperty("scrollWidth", 320);
        expect((await page.locator(".mobile-header").boundingBox()).height).toBeLessThan(140);
        await page.getByRole("link", { name: "Jak korzystać?", exact: true }).tap();
        await expect(page.getByRole("dialog")).toHaveCSS("width", "320px");
        await page.screenshot({ path: testInfo.outputPath("help-mobile-panel.png") });
        await page.getByRole("button", { name: "Wróć do pracy" }).tap();
        await page.getByRole("link", { name: "Instrukcja", exact: true }).tap();
        await expect(page.getByRole("heading", { name: "Instrukcja", exact: true })).toBeVisible();
        await expect(page.locator("html")).toHaveJSProperty("scrollWidth", 320);
        await page.screenshot({ path: testInfo.outputPath("help-mobile-page.png") });
        expect(
            (
                await new AxeBuilder({ page })
                    .include(".help-page")
                    .withTags(["wcag2a", "wcag2aa"])
                    .analyze()
            ).violations
        ).toEqual([]);
        await page.getByRole("button", { name: "Wróć do aplikacji" }).tap();
        await expect(page).toHaveURL(/\/builder\?slot=helmet$/);
        await expect(page.getByRole("heading", { name: "Hełm podróżnika" })).toBeVisible();
        await page.screenshot({ path: testInfo.outputPath("help-mobile-return.png") });
    });

    test("opens a shared topic directly and switches its language", async ({ page }) => {
        await page.goto("/help?topic=advisor");
        await expect(page.getByRole("heading", { name: "Jak korzystać z Doradcy?" })).toBeVisible();
        await page.getByRole("button", { name: "EN — English" }).tap();
        await expect(
            page.getByRole("heading", { name: "How do I use the Advisor?" })
        ).toBeVisible();
        await page.getByRole("button", { name: "Back to the app" }).tap();
        await expect(page).toHaveURL("/");
    });
});
