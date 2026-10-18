import { expect, test } from "@playwright/test";
import { Buffer } from "node:buffer";

const optimizerPath = "/api/optimizer/drifs";
const draft = (page) =>
    page.evaluate(
        () => JSON.parse(localStorage.getItem("broken-ranks-tool.equipment-draft.v3")).value
    );

async function scenario(request) {
    const http = await request.get("/api/initial-data");
    expect(http.status(), "Start the read-only backend on port 8082").toBe(200);
    const catalog = await http.json();
    const itemFor = (category) =>
        catalog.items.find(
            (item) =>
                item.category === category &&
                item.rarity === "RARE" &&
                ["X", "XI", "XII"].includes(item.tier) &&
                item.capacity >= 12
        );
    const drif = catalog.drifs.find(
        (stone) => stone.bonusType === "CRITICAL_CHANCE" && stone.size === "SUBDRIF"
    );
    const orb = catalog.orbs.find((stone) => stone.size === "SUBORB");
    const helmetItem = itemFor("HELMET");
    const armorItem = itemFor("ARMOR");
    expect(helmetItem).toBeTruthy();
    expect(armorItem).toBeTruthy();
    expect(drif).toBeTruthy();
    expect(orb).toBeTruthy();
    const slot = (itemId, level) => ({
        itemId,
        itemStars: 1,
        orbIds: [],
        orbLevels: [],
        drifIds: [drif.id],
        drifLevels: { 0: level },
    });
    const helmet = slot(helmetItem.id, 2);
    const armor = slot(armorItem.id, 3);
    const base = {
        mode: "REORGANIZE",
        configurationMode: "ADVANCED",
        originalSlots: { helmet },
        priorities: { CRITICAL_CHANCE: 15 },
        targetQuantities: { CRITICAL_CHANCE: { min: 1, max: 1 } },
        backpackSlotCount: 1,
        backpackDrifs: [{ id: "selected", templateId: drif.id, level: 6 }],
    };
    return { catalog, helmet, armor, drif, orb, base };
}

async function assertCalculatorParity(request, response) {
    const http = await request.post("/api/calculator/calculate", { data: response.optimizedSetup });
    expect(http.status()).toBe(200);
    expect(await http.json()).toEqual(response.calculationResult);
}

test("real reorganization API keeps locked sources and reports unmet soft targets", async ({
    request,
}) => {
    const { base, helmet, armor } = await scenario(request);
    const http = await request.post(optimizerPath, {
        data: {
            ...base,
            originalSlots: { helmet, armor },
            targetQuantities: { CRITICAL_CHANCE: { min: 2, max: 2 } },
            lockedSlots: ["armor"],
            lockedDrifs: { helmet: [0] },
            forceCapBonuses: ["CRITICAL_CHANCE"],
        },
    });
    expect(http.status()).toBe(200);
    const response = await http.json();
    expect(response.summary.outcome).toBe("VALID_BUILD_SOFT_TARGETS_UNMET");
    expect(response.summary.warnings.length).toBeGreaterThan(0);
    expect(response.optimizedSetup.slots.helmet.drifIds[0]).toBe(helmet.drifIds[0]);
    expect(response.optimizedSetup.slots.helmet.drifLevels[0]).toBe(2);
    expect(response.optimizedSetup.slots.armor).toEqual(armor);
    expect(response.reorganizationDrifUsages).toEqual([]);
    await assertCalculatorParity(request, response);
});

test("real reorganization API rejects an owned-pool shortage and incompatible options", async ({
    request,
}) => {
    const { base, armor } = await scenario(request);
    const shortage = await request.post(optimizerPath, {
        data: {
            ...base,
            originalSlots: {
                ...base.originalSlots,
                armor: { ...armor, drifIds: [], drifLevels: {} },
            },
            backpackDrifs: [],
            backpackSlotCount: 0,
            targetQuantities: { CRITICAL_CHANCE: { min: 2, max: 2 } },
        },
    });
    expect(shortage.status()).toBe(200);
    const rejected = await shortage.json();
    expect(rejected.summary.outcome).toBe("INVALID_INPUT");
    expect(rejected.summary.message).toContain("pula");
    expect(rejected.calculationResult).toBeNull();
    for (const changes of [
        { backpackOnly: true },
        { generateVariants: true },
        { backpackSlotCount: 0 },
    ]) {
        const invalid = await request.post(optimizerPath, { data: { ...base, ...changes } });
        expect(invalid.status()).toBe(400);
        expect((await invalid.json()).code).toBe("INVALID_REQUEST");
    }
});

for (const layout of ["desktop", "mobile"]) {
    test(`${layout} applies real reorganization to a full backpack and persists the exact occurrences`, async ({
        page,
        request,
    }) => {
        const { helmet, drif, orb } = await scenario(request);
        const backpack = [
            { id: "selected", kind: "DRIF", templateId: drif.id, level: 6, sendToBackend: true },
            { id: "unselected", kind: "DRIF", templateId: drif.id, level: 6 },
            ...Array.from({ length: 198 }, (_, index) => ({
                id: `orb-${index}`,
                kind: "ORB",
                templateId: orb.id,
                level: 1,
            })),
        ];
        await page.setViewportSize(
            layout === "desktop" ? { width: 1800, height: 1100 } : { width: 390, height: 844 }
        );
        await page.goto(`/builder?ui=${layout}`);
        await expect(page.locator('input[type="file"]')).toHaveCount(1);
        await page.locator('input[type="file"]').setInputFiles({
            name: "reorganization.json",
            mimeType: "application/json",
            buffer: Buffer.from(
                JSON.stringify({
                    format: "broken-ranks-tool-build",
                    version: 3,
                    build: {
                        requestData: { slots: { helmet }, characterStats: {} },
                        backpack,
                        lockedSlots: [],
                        lockedDrifs: {},
                        characterConfig: null,
                    },
                })
            ),
        });
        await expect(page.getByText(/Wczytano build z pliku/)).toBeVisible();
        await page.goto(`/optimizer?ui=${layout}`);
        if (layout === "mobile")
            await page.getByLabel("Tryb optymalizatora").selectOption("REORGANIZE");
        else await page.getByRole("button", { name: "Reorganizacja", exact: true }).click();
        await page.getByRole("button", { name: "Wstaw drif", exact: true }).click();
        await page.getByLabel("Drif z plecaka").selectOption("selected");
        await page.getByText("Ustawienia zaawansowane", { exact: true }).click();
        await page.getByLabel("Pozwól odkładać założone drify do plecaka").check();
        const pending = page.waitForResponse(
            (response) =>
                response.url().endsWith(optimizerPath) && response.request().method() === "POST"
        );
        await page.getByRole("button", { name: /Uruchom optymalizację/i }).click();
        const http = await pending;
        expect(http.status()).toBe(200);
        expect(http.request().postDataJSON()).toMatchObject({
            mode: "REORGANIZE",
            backpackSlotCount: 200,
            backpackDrifs: [{ id: "selected", templateId: drif.id, level: 6 }],
        });
        const response = await http.json();
        expect(response.summary.outcome).toBe("VALID_BUILD");
        expect(response.targetSetup).toBeNull();
        expect(response.backpackDrifUsages).toBeNull();
        expect(response.reorganizationDrifUsages).toEqual([
            {
                entryId: "selected",
                sourceSlotKey: null,
                sourceDrifIndex: null,
                slotKey: "helmet",
                drifIndex: 0,
            },
        ]);
        expect(response.optimizedSetup.slots.helmet.drifIds.filter(Boolean)).toEqual([drif.id]);
        expect(response.optimizedSetup.slots.helmet.drifLevels[0]).toBe(6);
        await assertCalculatorParity(request, response);
        await expect
            .poll(async () => (await draft(page)).requestData.slots.helmet.drifLevels[0])
            .toBe(6);
        const applied = await draft(page);
        expect(applied.backpack).toHaveLength(200);
        expect(applied.backpack.some((entry) => entry.id === "selected")).toBe(false);
        expect(applied.backpack.find((entry) => entry.id === "unselected")).toEqual({
            id: "unselected",
            kind: "DRIF",
            templateId: String(drif.id),
            level: 6,
        });
        expect(
            applied.backpack.filter((entry) => entry.kind === "ORB").map((entry) => entry.id)
        ).toEqual(backpack.filter((entry) => entry.kind === "ORB").map((entry) => entry.id));
        expect(
            applied.backpack.filter((entry) => entry.kind === "DRIF" && entry.level === 2)
        ).toEqual([expect.objectContaining({ templateId: String(drif.id) })]);
        if (layout === "mobile")
            await page.getByRole("button", { name: "Pokaż wynik →", exact: true }).click();
        await expect(
            page.getByRole("button", { name: "Zastosuj wybrany wariant", exact: true })
        ).toHaveCount(0);
        expect(await draft(page)).toEqual(applied);
        await page.reload();
        await expect(
            page.getByRole("group", { name: "Zadanie reorganizacji", exact: true })
        ).toBeVisible();
        expect(await draft(page)).toEqual(applied);
    });
}
