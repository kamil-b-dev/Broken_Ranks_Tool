import { expect, test } from "@playwright/test";
import { builderCatalog } from "../src/test/fixtures/equipment/builderCatalog.js";
import { mobileDevice } from "./mobile-device";

const catalog = {
    ...builderCatalog,
    dictionaries: {
        ...builderCatalog.dictionaries,
        itemCategories: { HELMET: "Hełm", ARMOR: "Zbroja" },
        drifCategories: { OFFENSIVE: "Ofensywne", DEFENSIVE: "Defensywne", UTILITY: "Użytkowe" },
    },
};

test.beforeEach(async ({ page }) => {
    await page.route("**/api/initial-data", (route) => route.fulfill({ json: catalog }));
    await page.route("**/api/calculator/calculate", (route) =>
        route.fulfill({ json: { stats: { Siła: 15 }, drifCategories: {}, orbBonusTypes: [] } })
    );
});

test("changes all desktop workspaces and persists English without changing character data", async ({
    page,
}) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "PL — Polski" })).toBeVisible();
    await page.getByRole("button", { name: "EN — English" }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await page.getByRole("link", { name: "Equipment builder", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Equipment", exact: true })).toBeVisible();
    const level = page.getByRole("spinbutton", { name: "Character level", exact: true });
    await level.fill("20");
    await level.press("Enter");
    await page.getByRole("button", { name: "Add point: Strength", exact: true }).click();
    await page.getByRole("button", { name: "PL — Polski" }).click();
    await expect(page.getByRole("spinbutton", { name: "Poziom postaci", exact: true })).toHaveValue(
        "20"
    );
    await expect(page.locator('[data-stat="Siła"] strong')).toHaveText("11");
    await page.getByRole("button", { name: "EN — English" }).click();
    await page.getByRole("link", { name: "Drif optimizer", exact: true }).click();
    await expect(page.getByRole("button", { name: "Advanced", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Advanced", exact: true }).click();
    await page.getByRole("textbox", { name: "Search stat to optimize" }).fill("critical");
    await expect(page.getByRole("button", { name: /Critical hit chance/ }).first()).toBeVisible();
    await page.getByRole("link", { name: /Local builds/ }).click();
    await expect(page.getByText("No local builds", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: /Progression path/ }).click();
    await expect(page.getByRole("combobox", { name: "Target build", exact: true })).toBeVisible();
    await page.getByRole("combobox", { name: "Target build", exact: true }).selectOption("current");
    await expect(page.getByRole("combobox", { name: "Target build", exact: true })).toHaveText(
        /Current build/
    );
    await expect(page.getByLabel("Balanced stat development")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("combobox", { name: "Target build", exact: true })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Target build", exact: true })).toHaveText(
        /Current build/
    );
    await page.screenshot({ path: "../tmp/i18n-desktop.png", fullPage: true });
});

test.describe("mobile localization", () => {
    test.use(mobileDevice);
    test("changes navigation, item picker, library and progression controls", async ({ page }) => {
        await page.goto("/builder");
        await page.getByRole("button", { name: "EN — English" }).click();
        await page.getByRole("button", { name: "Edit slot: Helmet", exact: true }).click();
        await page.getByRole("button", { name: "Choose item", exact: true }).click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await expect(page.getByRole("searchbox", { name: "Search item" })).toBeVisible();
        await page.getByRole("button", { name: "Close item selection" }).click();
        await page.getByRole("link", { name: /Builds/ }).click();
        await expect(page.getByText("No local builds", { exact: true })).toBeVisible();
        await page.getByRole("link", { name: /Progression path/ }).click();
        await expect(
            page.getByRole("combobox", { name: "Target build", exact: true })
        ).toBeVisible();
        await expect(page.getByLabel("Skip equipment changes within X levels")).toBeVisible();
        expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
        ).toBe(true);
        await page.screenshot({ path: "../tmp/i18n-mobile.png", fullPage: true });
    });
});
