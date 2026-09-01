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

    await page.locator("body").press("Tab");
    await expect(page.getByRole("link", { name: "Przejdź do głównej treści" })).toBeFocused();
    await expect(page.getByRole("link", { name: "Przejdź do głównej treści" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Broken Ranks Tool" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ekwipunek" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Zapisz lokalnie/ })).toBeVisible();

    await page.getByRole("button", { name: /Optymalizator drifów/ }).click();

    await expect(page.locator(".optimizer-theme")).toBeVisible();
    await expect(page.locator(".builder-theme")).toBeHidden();
});

test("preserves optimizer state when switching workspaces", async ({ page }) => {
    await page.route("http://localhost:8080/api/initial-data", (route) =>
        route.fulfill({ json: initialData })
    );

    await page.goto("/");
    await page.getByRole("button", { name: /Optymalizator drifów/ }).click();

    const bonusSearch = page.getByPlaceholder("Szukaj statystyki...");
    await bonusSearch.fill("obrażenia krytyczne");

    await page.getByRole("button", { name: /Kreator ekwipunku/i }).click();
    await expect(page.locator(".optimizer-theme")).toBeHidden();

    await page.getByRole("button", { name: /Optymalizator drifów/ }).click();
    await expect(bonusSearch).toHaveValue("obrażenia krytyczne");
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

test("shows initialization feedback until game data is ready", async ({ page }) => {
    let releaseResponse;
    const responseReady = new Promise((resolve) => {
        releaseResponse = resolve;
    });
    await page.route("http://localhost:8080/api/initial-data", async (route) => {
        await responseReady;
        await route.fulfill({ json: initialData });
    });

    await page.goto("/");

    await expect(page.getByRole("status")).toContainText("Ładowanie danych gry");
    await expect(page.getByRole("button", { name: /Zapisz lokalnie/ })).toBeDisabled();

    releaseResponse();
    await expect(page.getByRole("heading", { name: "Ekwipunek" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Zapisz lokalnie/ })).toBeEnabled();
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

test("constrains the item database to the equipment workbench height", async ({ page }) => {
    await page.setViewportSize({ width: 1792, height: 900 });
    await page.route("http://localhost:8080/api/initial-data", (route) =>
        route.fulfill({
            json: {
                ...initialData,
                items: Array.from({ length: 80 }, (_, index) => ({
                    id: index + 1,
                    name: `Przedmiot testowy ${index + 1}`,
                    category: "HELMET",
                    tier: "XII",
                    reqLevel: 120,
                })),
                dictionaries: {
                    ...initialData.dictionaries,
                    itemCategories: { HELMET: "Hełmy" },
                },
            },
        })
    );

    await page.goto("/");

    const databaseColumn = page.locator(".builder-database-column");
    const equipmentColumn = page.locator(".builder-equipment-column");
    const databaseResults = page.locator(".item-database-theme .custom-scrollbar");
    const [databaseBox, equipmentBox] = await Promise.all([
        databaseColumn.boundingBox(),
        equipmentColumn.boundingBox(),
    ]);

    expect(databaseBox?.height).toBeCloseTo(equipmentBox?.height ?? 0, 0);
    await expect(databaseResults).toHaveCSS("overflow-y", "auto");
    expect(
        await databaseResults.evaluate((element) => element.scrollHeight > element.clientHeight)
    ).toBe(true);
});
