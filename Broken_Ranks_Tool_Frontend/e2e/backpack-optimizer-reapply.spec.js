import { expect, test } from "@playwright/test";
import { Buffer } from "node:buffer";
import { builderCatalog } from "../src/test/fixtures/equipment/builderCatalog.js";

const baseline = {
    itemId: "1",
    itemStars: 1,
    orbIds: [],
    orbLevels: [],
    drifIds: [],
    drifLevels: {},
};
const stone = { id: "owned", kind: "DRIF", templateId: "60", level: 6, sendToBackend: true };
const setup = {
    slots: { helmet: { ...baseline, drifIds: ["60"], drifLevels: { 0: 6 } } },
    characterStats: {},
};
const draft = (page) =>
    page.evaluate(
        () => JSON.parse(localStorage.getItem("broken-ranks-tool.equipment-draft.v3")).value
    );

for (const layout of ["desktop", "mobile"]) {
    test(`${layout} cannot duplicate an owned stone through an old main optimizer result`, async ({
        page,
    }) => {
        await page.setViewportSize(
            layout === "desktop" ? { width: 1800, height: 1100 } : { width: 390, height: 844 }
        );
        const build = {
            requestData: { slots: { helmet: baseline }, characterStats: {} },
            backpack: [stone],
            characterConfig: null,
            lockedSlots: [],
            lockedDrifs: {},
        };
        await page.addInitScript((value) => {
            localStorage.setItem(
                "broken-ranks-tool.equipment-draft.v3",
                JSON.stringify({ version: 3, value })
            );
            localStorage.setItem(
                "broken-ranks-tool.optimizer-draft.v1",
                JSON.stringify({
                    version: 1,
                    value: {
                        format: "broken-ranks-tool-optimizer-config",
                        version: 1,
                        settings: {
                            mode: "BUILD_FROM_SCRATCH",
                            configurationMode: "ADVANCED",
                            backpackOnly: true,
                        },
                        priorities: [{ key: "CRITICAL_CHANCE", weight: 15, min: 0, max: 12 }],
                    },
                })
            );
        }, build);
        await page.route("**/api/initial-data", (route) => route.fulfill({ json: builderCatalog }));
        await page.route("**/api/calculator/calculate", (route) =>
            route.fulfill({ json: { stats: { CRITICAL_CHANCE: "9%" } } })
        );
        await page.route("**/api/optimizer/drifs", (route) =>
            route.fulfill({
                json: {
                    optimizedSetup: setup,
                    targetSetup: setup,
                    backpackDrifUsages: [{ entryId: "owned", slotKey: "helmet", drifIndex: 0 }],
                    calculationResult: { stats: { CRITICAL_CHANCE: "9%" } },
                    summary: {
                        success: true,
                        outcome: "VALID_BUILD",
                        message: "Użyto posiadanych drifów.",
                        goalResults: [],
                        nextVariants: [
                            {
                                main: true,
                                bonusName: "Główny",
                                setup,
                                changes: [],
                                statChanges: [],
                            },
                        ],
                    },
                },
            })
        );
        await page.goto(`/optimizer?ui=${layout}`);
        await page.getByRole("button", { name: /Uruchom optymalizację/i }).click();
        await expect.poll(async () => (await draft(page)).backpack.length).toBe(0);
        if (layout === "mobile")
            await page.getByRole("button", { name: "Pokaż wynik →", exact: true }).click();
        const apply = page.getByRole("button", { name: "Zastosuj wybrany wariant", exact: true });
        await apply.click();
        expect((await draft(page)).backpack).toEqual([]);
        const restored = {
            ...build,
            backpack: [{ ...stone, id: "returned", sendToBackend: false }],
        };
        await page
            .locator('input[type="file"]')
            .first()
            .setInputFiles({
                name: "returned-build.json",
                mimeType: "application/json",
                buffer: Buffer.from(
                    JSON.stringify({
                        format: "broken-ranks-tool-build",
                        version: 3,
                        build: restored,
                    })
                ),
            });
        await expect.poll(async () => (await draft(page)).backpack[0]?.id).toBe("returned");
        const importedBackpack = (await draft(page)).backpack;
        await apply.click();
        await expect(page.getByRole("alert")).toContainText("Uruchom optymalizację ponownie");
        const after = await draft(page);
        expect(after.requestData.slots.helmet.drifIds.filter(Boolean)).toEqual([]);
        expect(after.backpack).toEqual(importedBackpack);
    });
}
