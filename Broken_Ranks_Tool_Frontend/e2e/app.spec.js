import { expect, test } from "@playwright/test";

const initialData = {
    items: [],
    orbs: [],
    drifs: [],
    gameRules: {},
    dictionaries: {
        itemCategories: {},
        orbCategories: {},
        drifCategories: {},
    },
};

test("opens the builder and switches to the optimizer", async ({ page }) => {
    await page.route("http://localhost:8080/api/initial-data", (route) =>
        route.fulfill({ json: initialData })
    );

    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Broken Ranks Tool" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ekwipunek" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Zapisz build/ })).toBeVisible();

    await page.getByRole("button", { name: /Optymalizator drifów/ }).click();

    await expect(page.locator(".optimizer-theme")).toBeVisible();
    await expect(page.locator(".builder-theme")).toBeHidden();
});

test("shows a useful message when startup data cannot be loaded", async ({ page }) => {
    await page.route("http://localhost:8080/api/initial-data", (route) =>
        route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({ message: "Dane gry są chwilowo niedostępne." }),
        })
    );

    await page.goto("/");

    await expect(page.getByRole("alert")).toContainText("Dane gry są chwilowo niedostępne.");
});

test("keeps the builder and optimizer usable on a mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route("http://localhost:8080/api/initial-data", (route) =>
        route.fulfill({
            json: {
                ...initialData,
                items: [
                    {
                        id: 1,
                        name: "Przedmiot testowy o długiej nazwie",
                        category: "HELMET",
                        tier: "XII",
                        requiredLevel: 120,
                    },
                ],
                dictionaries: {
                    ...initialData.dictionaries,
                    itemCategories: { HELMET: "Karwasze i tarcze testowe" },
                },
            },
        })
    );

    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Ekwipunek" })).toBeVisible();
    await expect(page.locator(".builder-equipment-column")).toHaveCSS("order", "1");
    await expect(page.locator(".builder-database-column")).toHaveCSS("order", "2");
    await expect(page.locator("html")).toHaveJSProperty("scrollWidth", 390);

    await page.getByRole("button", { name: /Optymalizator drifów/ }).click();

    await expect(page.locator(".optimizer-overview dl")).toHaveCSS(
        "grid-template-columns",
        /.+ .+/
    );
    await expect(page.locator("html")).toHaveJSProperty("scrollWidth", 390);
});
