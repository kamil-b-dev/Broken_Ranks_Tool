import { expect, test } from "@playwright/test";
import { Buffer } from "node:buffer";

test("analyzes the current build once, displays a plan and applies it explicitly", async ({
    page,
}) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    const slots = {
        helmet: {
            itemId: 1,
            itemStars: 6,
            drifIds: [10],
            drifLevels: { 0: 6 },
            orbIds: [],
            orbLevels: [],
        },
        boots: { itemId: 2, itemStars: 9, drifIds: [], drifLevels: {}, orbIds: [], orbLevels: [] },
    };
    const suggested = {
        helmet: { ...slots.helmet, drifIds: [], drifLevels: {} },
        boots: { ...slots.boots, drifIds: [10], drifLevels: { 0: 6 } },
    };
    await page.route("**/api/initial-data", (route) =>
        route.fulfill({
            json: {
                items: [
                    {
                        id: 1,
                        name: "Hełm testowy",
                        category: "HELMET",
                        tier: "VII",
                        rarity: "RARE",
                        capacity: 12,
                        stats: {},
                    },
                    {
                        id: 2,
                        name: "Buty testowe",
                        category: "BOOTS",
                        tier: "VII",
                        rarity: "RARE",
                        capacity: 12,
                        stats: {},
                    },
                ],
                drifs: [
                    {
                        id: 10,
                        name: "Band",
                        size: "SUBDRIF",
                        bonusType: "CRITICAL_CHANCE",
                        baseValue: "10%",
                        increment: "0%",
                    },
                ],
                orbs: [],
                dictionaries: {
                    itemCategories: { HELMET: "Hełmy", BOOTS: "Buty" },
                    drifCategories: {},
                    orbCategories: {},
                },
                gameRules: {
                    epicBuiltInDrifs: {},
                    slotOrbRules: {},
                    elementalTypes: [],
                    bonusTranslations: {
                        CRITICAL_CHANCE: "Szansa na krytyk",
                        DAMAGE_MAGIC: "Obrażenia magiczne",
                        MANA_USAGE_REDUCTION: "Redukcja zużycia many",
                    },
                    drifBasePowers: {
                        CRITICAL_CHANCE: 4,
                        DAMAGE_MAGIC: 3,
                        MANA_USAGE_REDUCTION: 2,
                    },
                    drifMaxCaps: { CRITICAL_CHANCE: 60, MANA_USAGE_REDUCTION: -60 },
                },
            },
        })
    );
    await page.route("**/api/calculator/calculate", (route) =>
        route.fulfill({ json: { stats: { CRITICAL_CHANCE: "12%", MANA_USAGE_REDUCTION: "-10%" } } })
    );
    const requests = [];
    await page.route("**/api/optimizer/drifs", (route) => {
        requests.push(route.request().postDataJSON());
        return route.fulfill({
            json: {
                optimizedSetup: { slots: suggested },
                summary: {
                    success: true,
                    message: "Znaleziono sprawdzony plan poprawy.",
                    executionTimeSeconds: 0.2,
                    goalResults: [
                        {
                            statKey: "CRITICAL_CHANCE",
                            bonusName: "Szansa na krytyk",
                            priority: 30,
                            placedCount: 1,
                            minimumCount: 0,
                            maximumCount: 12,
                            calculatorValue: "13.5%",
                        },
                    ],
                    nextVariants: [
                        {
                            main: true,
                            bonusName: "Same przełożenia",
                            finalValue: 12,
                            variantValue: 13.5,
                            gain: 1.5,
                            changeCount: 1,
                            setup: { slots: suggested },
                            changes: [],
                            statChanges: [
                                {
                                    statKey: "CRITICAL_CHANCE",
                                    finalValue: "12%",
                                    variantValue: "13.5%",
                                },
                            ],
                        },
                    ],
                },
                advisorReport: {
                    goal: "CRITICAL_CHANCE",
                    plans: [
                        {
                            kind: "MOVES",
                            actions: ["Przenieś SUBDRIF Band 6 z hełmu do butów, gniazdo 1"],
                            upgrades: 0,
                            drifCounts: { CRITICAL_CHANCE: 1 },
                        },
                    ],
                },
            },
        });
    });
    page.on("dialog", (dialog) => dialog.dismiss());
    await page.goto("/");
    await expect(page.getByRole("button", { name: /Wczytaj build/ })).toBeEnabled();
    await page
        .locator('input[type="file"]')
        .first()
        .setInputFiles({
            name: "advisor-build.json",
            mimeType: "application/json",
            buffer: Buffer.from(
                JSON.stringify({
                    format: "broken-ranks-tool-build",
                    version: 1,
                    build: {
                        requestData: { slots, characterStats: {} },
                        lockedSlots: [],
                        lockedDrifs: {},
                    },
                })
            ),
        });
    await page.getByRole("link", { name: /Optymalizator drifów/ }).click();
    await page.getByRole("button", { name: /^Doradca/ }).click();
    await page.getByLabel("Główny cel").selectOption("CRITICAL_CHANCE");
    await expect(page.getByRole("option", { name: /Obrażenia magiczne.*0%/ })).toBeAttached();
    await page.getByRole("button", { name: /Analizuj build/i }).click();
    await expect(page.getByLabel("Plan zmian")).toContainText("Przenieś SUBDRIF Band 6");
    expect(requests).toHaveLength(1);
    expect(requests[0].originalSlots.helmet.drifIds.filter(Boolean).map(Number)).toEqual([10]);
    expect(requests[0].advisor).toMatchObject({
        goal: "CRITICAL_CHANCE",
        allowedChanges: { drifs: false },
        timeBudgetMs: 1500,
    });
    await expect(page.getByRole("button", { name: /Same przełożenia/ })).toContainText("1,5 p.p.");
    await page.screenshot({ path: "../tmp/advisor-desktop.png", fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Porady", exact: true }).click();
    await expect(page.getByLabel("Plan zmian")).toBeVisible();
    await expect(page.locator("html")).toHaveJSProperty("scrollWidth", 390);
    await page.screenshot({ path: "../tmp/advisor-mobile.png", fullPage: true });
    await page.getByRole("button", { name: /Zastosuj wybrany wariant/ }).click();
    await page.getByRole("button", { name: "Build", exact: true }).click();
    await expect(page.locator(".optimizer-lock-column")).toContainText("Buty testowe");
    await page.getByRole("button", { name: /Priorytety/ }).click();
    await page.getByRole("button", { name: /Analizuj ponownie/i }).click();
    await expect.poll(() => requests.length).toBe(2);
    expect(requests[1].originalSlots.boots.drifIds.filter(Boolean).map(Number)).toEqual([10]);
    expect(requests[1].originalSlots.helmet.drifIds.filter(Boolean)).toEqual([]);
});
