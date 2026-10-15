import { expect, test } from "@playwright/test";
import { builderCatalog } from "../src/test/fixtures/equipment/builderCatalog.js";

for (const layout of ["desktop", "mobile"]) {
    test(`${layout} reorganizes the owned pool without duplicating stones`, async ({ page }) => {
        const equipment = {
            itemId: "1",
            itemStars: 1,
            orbIds: [],
            orbLevels: [],
            drifIds: ["60"],
            drifLevels: { 0: 2 },
        };
        const final = { ...equipment, drifLevels: { 0: 6 } };
        await page.setViewportSize(
            layout === "desktop" ? { width: 1800, height: 1100 } : { width: 390, height: 844 }
        );
        await page.addInitScript(
            ({ equipment }) => {
                localStorage.setItem(
                    "broken-ranks-tool.equipment-draft.v3",
                    JSON.stringify({
                        version: 3,
                        value: {
                            requestData: { slots: { helmet: equipment }, characterStats: {} },
                            characterConfig: null,
                            lockedSlots: [],
                            lockedDrifs: {},
                            backpack: [
                                {
                                    id: "selected",
                                    kind: "DRIF",
                                    templateId: "60",
                                    level: 6,
                                    sendToBackend: true,
                                },
                                { id: "unselected", kind: "DRIF", templateId: "60", level: 1 },
                            ],
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
                            settings: { mode: "BUILD_FROM_SCRATCH", configurationMode: "SIMPLE" },
                            priorities: [{ key: "CRITICAL_CHANCE", weight: 15, min: 0, max: 12 }],
                        },
                    })
                );
            },
            { equipment }
        );
        await page.route("**/api/initial-data", (route) => route.fulfill({ json: builderCatalog }));
        await page.route("**/api/calculator/calculate", (route) =>
            route.fulfill({ json: { stats: { CRITICAL_CHANCE: "9%" } } })
        );
        let received;
        await page.route("**/api/optimizer/drifs", (route) => {
            received = route.request().postDataJSON();
            return route.fulfill({
                json: {
                    optimizedSetup: { slots: { helmet: final }, characterStats: {} },
                    reorganizationDrifUsages: [
                        {
                            entryId: "selected",
                            sourceSlotKey: null,
                            sourceDrifIndex: null,
                            slotKey: "helmet",
                            drifIndex: 0,
                        },
                    ],
                    calculationResult: { stats: { CRITICAL_CHANCE: "9%" } },
                    summary: {
                        success: true,
                        outcome: "VALID_BUILD",
                        message: "Znaleziono poprawny układ posiadanych drifów.",
                        nextVariants: [
                            {
                                main: true,
                                bonusName: "Wynik główny",
                                setup: { slots: { helmet: final } },
                                calculationResult: { stats: { CRITICAL_CHANCE: "9%" } },
                                changes: [],
                            },
                        ],
                    },
                },
            });
        });
        await page.goto(`/optymalizator?ui=${layout}`);
        if (layout === "mobile")
            await page.getByLabel("Tryb optymalizatora").selectOption("REORGANIZE");
        else await page.getByRole("button", { name: "Reorganizacja", exact: true }).click();
        await expect(page.getByText("Ekwipunek: 1 · Zaznaczone w plecaku: 1")).toBeVisible();
        await expect(page.getByRole("heading", { name: "Pula drifów" })).toHaveCSS(
            "font-family",
            /Inter/
        );
        await expect(page.getByRole("checkbox", { name: "Użyj drifów z plecaka" })).toHaveCount(0);
        await expect(page.getByText("Potencjalny zakres", { exact: true })).toHaveCount(0);
        await page.screenshot({ path: `../tmp/reorganization-${layout}.png`, fullPage: true });
        await page.getByRole("button", { name: /Uruchom optymalizację/i }).click();
        const draft = () =>
            page.evaluate(
                () => JSON.parse(localStorage.getItem("broken-ranks-tool.equipment-draft.v3")).value
            );
        await expect.poll(() => received?.mode).toBe("REORGANIZE");
        expect(received.backpackOnly).toBeUndefined();
        expect(received.backpackDrifs).toEqual([{ id: "selected", templateId: 60, level: 6 }]);
        await expect
            .poll(async () => (await draft()).requestData.slots.helmet.drifLevels[0])
            .toBe(6);
        const stored = await draft();
        expect(stored.backpack).toHaveLength(2);
        expect(stored.backpack.some((entry) => entry.id === "selected")).toBe(false);
        expect(stored.backpack.find((entry) => entry.id === "unselected").level).toBe(1);
        expect(stored.backpack.find((entry) => entry.level === 2).sendToBackend).toBeFalsy();
        if (layout === "mobile") await page.getByRole("button", { name: "Pokaż wynik →" }).click();
        await page.getByRole("button", { name: "Zastosuj wybrany wariant" }).click();
        expect((await draft()).backpack).toEqual(stored.backpack);
        expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
        ).toBe(true);
    });
}
