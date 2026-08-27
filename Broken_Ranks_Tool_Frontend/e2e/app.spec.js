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
