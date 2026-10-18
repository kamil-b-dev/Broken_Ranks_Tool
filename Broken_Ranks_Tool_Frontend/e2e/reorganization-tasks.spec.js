import { expect, test } from "@playwright/test";
import { builderCatalog } from "../src/test/fixtures/equipment/builderCatalog.js";

for (const layout of ["desktop", "mobile"]) {
    test(`${layout} makes room for one selected level-21 upgrade and preserves the pool`, async ({
        page,
    }) => {
        const stone = (itemId, id, level) => ({
            itemId,
            itemStars: 1,
            orbIds: [],
            orbLevels: [],
            drifIds: [id],
            drifLevels: { 0: level },
        });
        const original = { helmet: stone(1, 61, 16), armor: stone(2, 62, 6) };
        const final = { helmet: stone(1, 62, 6), armor: stone(2, 61, 21) };
        const catalog = {
            ...builderCatalog,
            items: builderCatalog.items.map((item) =>
                item.id === 2 ? { ...item, capacity: 16 } : item
            ),
            drifs: [
                ...builderCatalog.drifs,
                { id: 61, name: "Arcy Band", bonusType: "CRITICAL_CHANCE", size: "ARCYDRIF" },
                { id: 62, name: "Regen", bonusType: "MANA_REGEN", size: "SUBDRIF" },
            ],
            gameRules: {
                ...builderCatalog.gameRules,
                drifBasePowers: { CRITICAL_CHANCE: 4, MANA_REGEN: 1 },
                bonusTranslations: {
                    CRITICAL_CHANCE: "Szansa na krytyk",
                    MANA_REGEN: "Regeneracja many",
                },
            },
        };
        await page.setViewportSize(
            layout === "desktop" ? { width: 1600, height: 1000 } : { width: 390, height: 844 }
        );
        await page.addInitScript(
            ({ original }) => {
                localStorage.setItem(
                    "broken-ranks-tool.equipment-draft.v3",
                    JSON.stringify({
                        version: 3,
                        value: {
                            requestData: { slots: original, characterStats: {} },
                            lockedSlots: [],
                            lockedDrifs: {},
                            backpack: [],
                            characterConfig: null,
                        },
                    })
                );
                localStorage.setItem(
                    "broken-ranks-tool.optimizer-draft.v1",
                    JSON.stringify({
                        version: 1,
                        value: {
                            format: "broken-ranks-tool-optimizer-config",
                            version: 1,
                            priorities: [],
                            settings: {
                                mode: "REORGANIZE",
                                reorganization: {
                                    task: "UPGRADE",
                                    source: "helmet:0",
                                    targetTemplateId: 61,
                                    targetLevel: 21,
                                },
                            },
                        },
                    })
                );
            },
            { original }
        );
        await page.route("**/api/initial-data", (route) => route.fulfill({ json: catalog }));
        await page.route("**/api/calculator/calculate", (route) =>
            route.fulfill({ json: { stats: { CRITICAL_CHANCE: "20%", MANA_REGEN: "11%" } } })
        );
        let received;
        await page.route("**/api/optimizer/drifs", (route) => {
            received = route.request().postDataJSON();
            return route.fulfill({
                json: {
                    optimizedSetup: { slots: final, characterStats: {} },
                    reorganizationDrifUsages: [
                        {
                            entryId: null,
                            sourceSlotKey: "helmet",
                            sourceDrifIndex: 0,
                            slotKey: "armor",
                            drifIndex: 0,
                        },
                        {
                            entryId: null,
                            sourceSlotKey: "armor",
                            sourceDrifIndex: 0,
                            slotKey: "helmet",
                            drifIndex: 0,
                        },
                    ],
                    reorganizationStatChanges: [
                        { statKey: "CRITICAL_CHANCE", finalValue: "20%", variantValue: "28%" },
                    ],
                    calculationResult: { stats: { CRITICAL_CHANCE: "28%", MANA_REGEN: "11%" } },
                    summary: {
                        success: true,
                        outcome: "VALID_BUILD",
                        goalResults: [],
                        warnings: [],
                        nextVariants: [
                            {
                                main: true,
                                bonusName: "Wynik główny",
                                setup: { slots: final },
                                changes: [],
                                statChanges: [],
                            },
                        ],
                    },
                },
            });
        });
        await page.goto(`/optimizer?ui=${layout}`);
        await expect(
            page.getByRole("button", { name: "Ulepsz drify", exact: true })
        ).toHaveAttribute("aria-pressed", "true");
        await expect(page.getByLabel("Kamień do ulepszenia")).toHaveValue("helmet:0");
        await expect(page.getByLabel("Docelowy poziom")).toHaveValue("21");
        await page.getByText("Ustawienia zaawansowane", { exact: true }).click();
        const moveLimit = page.getByLabel("Maksymalna liczba przełożeń");
        await expect(moveLimit).toHaveAttribute("min", "1");
        await expect(moveLimit).toHaveAttribute("max", "50");
        await moveLimit.fill("2");
        await expect(page.getByLabel("Jak najmniej przełożeń")).toHaveCount(0);
        await expect(page.getByText("Priorytety i limity", { exact: true })).toHaveCount(0);
        await page.screenshot({ path: `../tmp/reorganization-task-${layout}.png`, fullPage: true });
        await page.getByRole("button", { name: /Uruchom optymalizację/i }).click();
        await expect
            .poll(() => received?.reorganization)
            .toMatchObject({
                task: "UPGRADE",
                allowUnequip: false,
                maxMoves: 2,
                upgrades: [
                    {
                        sourceSlotKey: "helmet",
                        sourceDrifIndex: 0,
                        targetTemplateId: 61,
                        targetLevel: 21,
                    },
                ],
            });
        expect(received.priorities).toEqual({});
        expect(received.reorganization.preferFewestMoves).toBeUndefined();
        expect(received.backpackDrifs).toEqual([]);
        if (layout === "mobile") await page.getByRole("button", { name: "Pokaż wynik →" }).click();
        await expect(page.getByText("Po przełożeniu ulepsz:", { exact: true })).toBeVisible();
        await expect(page.getByText("12/12 → 1/12", { exact: false })).toBeVisible();
        await expect
            .poll(() =>
                page.evaluate(
                    () =>
                        JSON.parse(localStorage.getItem("broken-ranks-tool.equipment-draft.v3"))
                            .value.requestData.slots.armor.drifLevels[0]
                )
            )
            .toBe(21);
        const backpack = await page.evaluate(
            () =>
                JSON.parse(localStorage.getItem("broken-ranks-tool.equipment-draft.v3")).value
                    .backpack
        );
        expect(backpack).toEqual([]);
        if (layout === "mobile")
            await page.getByRole("button", { name: "Cele", exact: true }).click();
        await expect(page.getByLabel("Kamień do ulepszenia")).toHaveValue("armor:0");
        await expect(page.getByLabel("Docelowy kamień")).toHaveValue("61");
        await expect(
            page.getByRole("button", { name: /optymalizuj ponownie|Uruchom optymalizację/i })
        ).toBeDisabled();
        if (layout === "mobile")
            await page.getByRole("button", { name: "Wynik", exact: true }).click();
        await page.screenshot({
            path: `../tmp/reorganization-task-result-${layout}.png`,
            fullPage: true,
        });
    });
}
