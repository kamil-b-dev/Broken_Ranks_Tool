import { expect, test } from "@playwright/test";
import { builderCatalog } from "../src/test/fixtures/equipment/builderCatalog.js";

for (const layout of ["desktop", "mobile"]) {
    test(`${layout} persists drif selection and applies final backpack substitutions`, async ({
        page,
    }) => {
        const equipment = {
            itemId: "1",
            itemStars: 7,
            orbIds: [],
            orbLevels: [],
            drifIds: ["60"],
            drifLevels: { 0: 2 },
        };
        const backpack = [
            { id: "selected", kind: "DRIF", templateId: "60", level: 3 },
            { id: "unselected", kind: "DRIF", templateId: "60", level: 6 },
            { id: "orb", kind: "ORB", templateId: "50", level: 1 },
            {
                id: "item",
                kind: "ITEM",
                equipment: { ...equipment, itemId: "5", drifIds: [], drifLevels: {} },
            },
        ];
        await page.setViewportSize({ width: 1800, height: 1100 });
        await page.addInitScript(
            (value) => {
                if (!localStorage.getItem("broken-ranks-tool.equipment-draft.v3"))
                    localStorage.setItem(
                        "broken-ranks-tool.equipment-draft.v3",
                        JSON.stringify({ version: 3, value })
                    );
            },
            {
                requestData: { slots: { helmet: equipment }, characterStats: {} },
                backpack,
                characterConfig: null,
                lockedSlots: [],
                lockedDrifs: {},
            }
        );
        await page.route("**/api/initial-data", (route) => route.fulfill({ json: builderCatalog }));
        await page.route("**/api/calculator/calculate", (route) =>
            route.fulfill({ json: { stats: { CRITICAL_CHANCE: "12%" } } })
        );
        let received;
        await page.route("**/api/optimizer/drifs", (route) => {
            received = route.request().postDataJSON();
            return route.fulfill({
                json: {
                    optimizedSetup: {
                        slots: { helmet: { ...equipment, drifLevels: { 0: 3 } } },
                        characterStats: {},
                    },
                    targetSetup: {
                        slots: { helmet: { ...equipment, drifLevels: { 0: 6 } } },
                        characterStats: {},
                    },
                    backpackDrifUsages: [{ entryId: "selected", slotKey: "helmet", drifIndex: 0 }],
                    calculationResult: { stats: { CRITICAL_CHANCE: "12%" } },
                    summary: {
                        success: true,
                        outcome: "VALID_BUILD",
                        message: "Użyto posiadanych drifów.",
                        nextVariants: [],
                    },
                },
            });
        });
        const draft = () =>
            page.evaluate(
                () => JSON.parse(localStorage.getItem("broken-ranks-tool.equipment-draft.v3")).value
            );
        await page.goto("/builder?ui=desktop");
        const buttonStyle = (element) => {
            const style = getComputedStyle(element);
            return [
                style.fontFamily,
                style.fontSize,
                style.fontWeight,
                style.color,
                style.backgroundColor,
                style.borderColor,
                style.height,
            ];
        };
        expect(
            await page
                .getByRole("button", { name: "max lvl drify", exact: true })
                .evaluate(buttonStyle)
        ).toEqual(
            await page
                .getByRole("button", { name: "Zdejmij wszystkie drify", exact: true })
                .evaluate(buttonStyle)
        );
        await page
            .locator(".builder-equipment-column")
            .screenshot({ path: "../tmp/equipment-actions.png" });
        await page
            .getByRole("group", { name: "Widok ekwipunku" })
            .or(page.getByRole("navigation", { name: "Sekcje kreatora" }))
            .getByRole("button", { name: "Plecak", exact: true })
            .click();
        await page
            .getByRole("checkbox", {
                name: "Drif do optymalizacji: Band, SUBDRIF, poziom 3",
                exact: true,
            })
            .first()
            .check();
        await expect
            .poll(
                async () =>
                    (await draft()).backpack.find((entry) => entry.id === "selected").sendToBackend
            )
            .toBe(true);
        await page.screenshot({ path: "../tmp/backpack-optimizer-selection.png" });
        if (layout === "mobile") await page.setViewportSize({ width: 320, height: 740 });
        await page.goto(`/optimizer?ui=${layout}`);
        if (layout === "mobile") {
            await page.getByLabel("Tryb optymalizatora").selectOption("ADVANCED");
            await page.getByText("Opcje i warianty", { exact: true }).click();
        } else {
            await page.getByRole("button", { name: "Zaawansowany", exact: true }).click();
            const choiceStyle = (element) => {
                const style = getComputedStyle(element.nextElementSibling);
                return [
                    style.fontFamily,
                    style.fontSize,
                    style.fontWeight,
                    style.color,
                    style.lineHeight,
                ];
            };
            expect(
                await page
                    .getByRole("checkbox", { name: "Użyj drifów z plecaka", exact: true })
                    .evaluate(choiceStyle)
            ).toEqual(
                await page
                    .getByRole("checkbox", { name: /Wymuś maksymalizację/ })
                    .evaluate(choiceStyle)
            );
            await page
                .locator(".optimizer-settings-strip")
                .screenshot({ path: "../tmp/optimizer-settings.png" });
        }
        await page.getByRole("checkbox", { name: "Użyj drifów z plecaka", exact: true }).check();
        if (layout === "mobile") {
            await page.getByRole("button", { name: "＋ Dodaj cel", exact: true }).click();
            await page.getByRole("button", { name: "Szansa na krytyk", exact: true }).click();
        } else {
            await page
                .locator(".optimizer-bonus-card")
                .filter({ hasText: "Szansa na krytyk" })
                .click();
        }
        await page.getByRole("button", { name: /Uruchom optymalizację/i }).click();
        await expect
            .poll(() => received?.backpackDrifs)
            .toEqual([{ id: "selected", templateId: 60, level: 3 }]);
        expect(received.backpackOnly).toBe(true);
        expect(received.generateVariants).toBe(false);
        await expect
            .poll(async () => (await draft()).requestData.slots.helmet.drifLevels[0])
            .toBe(3);
        if (layout === "mobile")
            await page.getByRole("button", { name: "Pokaż wynik →", exact: true }).click();
        await page.getByText("Drify z plecaka — poziomy docelowe").click();
        await expect(page.locator(".optimizer-backpack-targets tbody tr")).toContainText("3");
        await expect(page.locator(".optimizer-backpack-targets tbody tr")).toContainText("6");
        await page
            .locator(".optimizer-backpack-targets")
            .screenshot({ path: `../tmp/backpack-upgrade-targets-${layout}.png` });
        const stored = await draft();
        expect(stored.backpack).toHaveLength(4);
        expect(stored.backpack.some((entry) => entry.id === "selected")).toBe(false);
        expect(stored.backpack.find((entry) => entry.id === "unselected").level).toBe(6);
        expect(
            stored.backpack.find((entry) => entry.kind === "DRIF" && entry.level === 2)
        ).toBeTruthy();
    });
}
