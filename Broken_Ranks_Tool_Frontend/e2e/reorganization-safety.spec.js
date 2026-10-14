import { expect, test } from "@playwright/test";
import { builderCatalog } from "../src/test/fixtures/equipment/builderCatalog.js";

const slot = (itemId, level) => ({
    itemId,
    itemStars: 1,
    orbIds: [],
    orbLevels: [],
    drifIds: [60],
    drifLevels: { 0: level },
});
const helmet = slot(1, 2);
const selected = { id: "selected", kind: "DRIF", templateId: "60", level: 6, sendToBackend: true };
const draft = (page) =>
    page.evaluate(
        () => JSON.parse(localStorage.getItem("broken-ranks-tool.equipment-draft.v3")).value
    );

async function initialize(page, layout, changes = {}) {
    await page.setViewportSize(
        layout === "desktop" ? { width: 1800, height: 1100 } : { width: 390, height: 844 }
    );
    await page.addInitScript(
        (value) => {
            if (!localStorage.getItem("broken-ranks-tool.equipment-draft.v3"))
                localStorage.setItem(
                    "broken-ranks-tool.equipment-draft.v3",
                    JSON.stringify({ version: 3, value })
                );
            if (!localStorage.getItem("broken-ranks-tool.optimizer-draft.v1"))
                localStorage.setItem(
                    "broken-ranks-tool.optimizer-draft.v1",
                    JSON.stringify({
                        version: 1,
                        value: {
                            format: "broken-ranks-tool-optimizer-config",
                            version: 1,
                            settings: { mode: "REORGANIZE", configurationMode: "ADVANCED" },
                            priorities: [{ key: "CRITICAL_CHANCE", weight: 15, min: 0, max: 12 }],
                        },
                    })
                );
        },
        {
            requestData: { slots: { helmet }, characterStats: {} },
            backpack: [selected],
            lockedSlots: [],
            lockedDrifs: {},
            characterConfig: null,
            ...changes,
        }
    );
    await page.route("**/api/initial-data", (route) => route.fulfill({ json: builderCatalog }));
    await page.route("**/api/calculator/calculate", (route) =>
        route.fulfill({ json: { stats: { CRITICAL_CHANCE: "4%" } } })
    );
    await page.goto(`/optymalizator?ui=${layout}`);
    await expect(page.getByRole("heading", { name: "Pula drifów" })).toBeVisible({
        timeout: 15000,
    });
}

const successful = (slots, usages) => ({
    optimizedSetup: { slots, characterStats: {} },
    reorganizationDrifUsages: usages,
    calculationResult: { stats: { CRITICAL_CHANCE: "9%" } },
    summary: {
        success: true,
        outcome: "VALID_BUILD",
        message: "Zastosowano reorganizację.",
        nextVariants: [],
    },
});

async function showResult(page, layout) {
    if (layout === "mobile") await page.getByRole("button", { name: "Pokaż wynik →" }).click();
}

for (const layout of ["desktop", "mobile"]) {
    test(`${layout} swaps equipped stones between slots and preserves the change after reload`, async ({
        page,
    }) => {
        await initialize(page, layout, {
            requestData: { slots: { helmet, armor: slot(2, 6) }, characterStats: {} },
        });
        await page.route("**/api/optimizer/drifs", (route) =>
            route.fulfill({
                json: successful({ helmet: slot(1, 6), armor: slot(2, 2) }, [
                    {
                        entryId: null,
                        sourceSlotKey: "armor",
                        sourceDrifIndex: 0,
                        slotKey: "helmet",
                        drifIndex: 0,
                    },
                    {
                        entryId: null,
                        sourceSlotKey: "helmet",
                        sourceDrifIndex: 0,
                        slotKey: "armor",
                        drifIndex: 0,
                    },
                ]),
            })
        );
        const before = await draft(page);
        await page.getByRole("button", { name: /Uruchom optymalizację/i }).click();
        await expect
            .poll(async () => (await draft(page)).requestData.slots.helmet.drifLevels[0])
            .toBe(6);
        const applied = await draft(page);
        expect(applied.requestData.slots.armor.drifLevels[0]).toBe(2);
        expect(applied.backpack).toEqual(before.backpack);
        await page.reload();
        await expect(page.getByRole("heading", { name: "Pula drifów" })).toBeVisible();
        expect(await draft(page)).toEqual(applied);
        if (layout === "mobile")
            await expect(page.getByLabel("Tryb optymalizatora")).toHaveValue("REORGANIZE");
        else
            await expect(
                page.getByRole("button", { name: "Reorganizacja", exact: true })
            ).toHaveAttribute("aria-current", "page");
    });

    test(`${layout} rejects a response with a reused occurrence without changing either inventory`, async ({
        page,
    }) => {
        const armor = { ...slot(2, 1), drifIds: [], drifLevels: {} };
        await initialize(page, layout, {
            requestData: { slots: { helmet, armor }, characterStats: {} },
        });
        await page.route("**/api/optimizer/drifs", (route) =>
            route.fulfill({
                json: successful(
                    { helmet: slot(1, 6), armor: slot(2, 6) },
                    ["helmet", "armor"].map((slotKey) => ({
                        entryId: "selected",
                        sourceSlotKey: null,
                        sourceDrifIndex: null,
                        slotKey,
                        drifIndex: 0,
                    }))
                ),
            })
        );
        const before = await draft(page);
        await page.getByRole("button", { name: /Uruchom optymalizację/i }).click();
        await showResult(page, layout);
        await expect(page.locator(".optimizer-status-message")).toContainText("plecaka");
        expect(await draft(page)).toEqual(before);
    });

    test(`${layout} rejects a stale response after a lock changes during calculation`, async ({
        page,
    }) => {
        await initialize(page, layout);
        let release;
        const gate = new Promise((resolve) => {
            release = resolve;
        });
        let started;
        const arrived = new Promise((resolve) => {
            started = resolve;
        });
        await page.route("**/api/optimizer/drifs", async (route) => {
            started();
            await gate;
            await route.fulfill({
                json: successful({ helmet: slot(1, 6) }, [
                    {
                        entryId: "selected",
                        sourceSlotKey: null,
                        sourceDrifIndex: null,
                        slotKey: "helmet",
                        drifIndex: 0,
                    },
                ]),
            });
        });
        await page.getByRole("button", { name: /Uruchom optymalizację/i }).click();
        await arrived;
        if (layout === "mobile")
            await page.getByRole("button", { name: "Blokady", exact: true }).click();
        await page.getByRole("button", { name: "Zablokuj drif", exact: true }).click();
        await expect.poll(async () => (await draft(page)).lockedDrifs.helmet).toEqual([0]);
        const locked = await draft(page);
        release();
        await showResult(page, layout);
        await expect(page.locator(".optimizer-status-message")).toContainText(
            "zmieniły się podczas obliczeń"
        );
        expect(await draft(page)).toEqual(locked);
    });

    test(`${layout} rejects an overflowing return to a full backpack atomically`, async ({
        page,
    }) => {
        await initialize(page, layout, {
            backpack: Array.from({ length: 200 }, (_, index) => ({
                id: `kept-${index}`,
                kind: "DRIF",
                templateId: "60",
                level: 1,
            })),
        });
        await page.route("**/api/optimizer/drifs", (route) =>
            route.fulfill({
                json: successful({ helmet: { ...helmet, drifIds: [], drifLevels: {} } }, []),
            })
        );
        const before = await draft(page);
        await page.getByRole("button", { name: /Uruchom optymalizację/i }).click();
        await showResult(page, layout);
        await expect(page.locator(".optimizer-status-message")).toContainText("Brak miejsca");
        expect(await draft(page)).toEqual(before);
    });
}
