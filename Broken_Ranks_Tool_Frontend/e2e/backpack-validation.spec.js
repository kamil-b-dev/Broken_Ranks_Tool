import { expect, test } from "@playwright/test";
import { Buffer } from "node:buffer";
import { builderCatalog } from "../src/test/fixtures/equipment/builderCatalog.js";

const helmet = {
    itemId: "1",
    itemStars: 7,
    orbIds: [],
    orbLevels: [],
    drifIds: ["60"],
    drifLevels: { 0: 2 },
};
const stone = (id, changes = {}) => ({
    id,
    kind: "DRIF",
    templateId: "60",
    level: 3,
    ...changes,
});
const inventory = (count) => Array.from({ length: count }, (_, index) => stone(`owned-${index}`));
const draft = (page) =>
    page.evaluate(
        () => JSON.parse(localStorage.getItem("broken-ranks-tool.equipment-draft.v3")).value
    );
const initialize = async (page, backpack, changes = {}) => {
    await page.addInitScript(
        (value) => {
            const key = "broken-ranks-tool.equipment-draft.v3";
            if (!localStorage.getItem(key))
                localStorage.setItem(key, JSON.stringify({ version: 3, value }));
        },
        {
            requestData: { slots: { helmet }, characterStats: {} },
            backpack,
            characterConfig: null,
            lockedSlots: [],
            lockedDrifs: {},
            ...changes,
        }
    );
    await page.route("**/api/initial-data", (route) => route.fulfill({ json: builderCatalog }));
    await page.route("**/api/calculator/calculate", (route) =>
        route.fulfill({ json: { stats: { CRITICAL_CHANCE: "12%" } } })
    );
};
const importBackpack = (page, backpack, version = 3) =>
    page
        .locator('input[type="file"]')
        .first()
        .setInputFiles({
            name: "backpack-validation.json",
            mimeType: "application/json",
            buffer: Buffer.from(
                JSON.stringify({
                    format: "broken-ranks-tool-build",
                    version,
                    build: {
                        requestData: {
                            slots: { helmet: { ...helmet, itemStars: 8 } },
                            characterStats: {},
                        },
                        backpack,
                        characterConfig: null,
                        lockedSlots: [],
                        lockedDrifs: {},
                    },
                })
            ),
        });
const openBackpack = async (page, layout = "desktop") => {
    await page.setViewportSize(
        layout === "mobile" ? { width: 320, height: 740 } : { width: 1800, height: 1100 }
    );
    await page.goto(`/kreator?ui=${layout}`);
    await page.getByRole("button", { name: "Plecak W.I.P", exact: true }).click();
};

for (const layout of ["desktop", "mobile"]) {
    test(`${layout} rejects malformed imports atomically, accepts 200 entries and persists them`, async ({
        page,
    }) => {
        await initialize(page, [stone("kept", { sendToBackend: true })], {
            lockedSlots: ["helmet"],
            lockedDrifs: { helmet: [0] },
        });
        await openBackpack(page, layout);
        if (layout === "mobile") await page.locator(".mobile-build-actions summary").click();
        await expect(
            page.getByRole("button", { name: /Wczytaj (build|plik buildu)/ })
        ).toBeEnabled();
        const before = await draft(page);
        const malformed = [
            { backpack: Array(201).fill(null), message: /maksymalnie 200/ },
            { backpack: Array(201).fill(null), version: 2, message: /maksymalnie 200/ },
            { backpack: [null], message: /niepoprawne dane/ },
            { backpack: [null], version: 2, message: /niepoprawne dane/ },
            { backpack: [stone("same"), stone("same")], message: /niepoprawne dane/ },
            {
                backpack: [stone("bad-flag", { sendToBackend: "true" })],
                message: /niepoprawne dane/,
            },
            {
                backpack: [
                    { id: "orb", kind: "ORB", templateId: "50", level: 1, sendToBackend: true },
                ],
                message: /niepoprawne dane/,
            },
            {
                backpack: [
                    {
                        id: "orphan",
                        kind: "ITEM",
                        equipment: { ...helmet, drifIds: [null], drifLevels: { 0: 2 } },
                    },
                ],
                message: /niepoprawne dane/,
            },
            {
                backpack: [
                    {
                        id: "orb-hole",
                        kind: "ITEM",
                        equipment: { ...helmet, orbIds: [null, "50"], orbLevels: [null, 1] },
                    },
                ],
                message: /niepoprawne dane/,
            },
        ];
        for (const { backpack, message, version } of malformed) {
            await importBackpack(page, backpack, version);
            await expect(page.getByRole("alert")).toContainText(message);
            expect(await draft(page)).toEqual(before);
            await expect(page.locator(".backpack-card")).toHaveCount(1);
            await expect(
                page.getByRole("checkbox", { name: /Drif do optymalizacji/ })
            ).toBeChecked();
        }
        await importBackpack(page, inventory(200));
        await expect(page.getByText(/Wczytano build z pliku backpack-validation/)).toBeVisible();
        await expect.poll(async () => (await draft(page)).backpack.length).toBe(200);
        expect((await draft(page)).requestData.slots.helmet.itemStars).toBe(8);
        await page.reload();
        await page.getByRole("button", { name: "Plecak W.I.P", exact: true }).click();
        await expect(page.locator(".backpack-card")).toHaveCount(200);
        expect((await draft(page)).backpack.map((entry) => entry.id)).toEqual(
            inventory(200).map((entry) => entry.id)
        );
    });
}

test("the 200th slot is usable, the 201st duplicate and equipment removal are blocked until space is freed", async ({
    page,
}) => {
    await initialize(page, inventory(199));
    await openBackpack(page);
    const duplicate = page.getByRole("button", { name: "Duplikuj: Band", exact: true }).first();
    await duplicate.click();
    await expect.poll(async () => (await draft(page)).backpack.length).toBe(200);
    const full = await draft(page);
    await duplicate.click();
    await expect(page.getByRole("alert")).toContainText(/200/);
    expect(await draft(page)).toEqual(full);
    await page.getByRole("button", { name: "Postać", exact: true }).click();
    const removeAll = page.getByRole("button", {
        name: "Zdejmij wszystkie przedmioty",
        exact: true,
    });
    await expect(removeAll).toBeDisabled();
    await expect(removeAll).toHaveAttribute("title", /200/);
    await page.getByRole("button", { name: "Plecak W.I.P", exact: true }).click();
    await page.getByRole("button", { name: "Usuń z plecaka: Band", exact: true }).first().click();
    await expect.poll(async () => (await draft(page)).backpack.length).toBe(199);
    await page.getByRole("button", { name: "Postać", exact: true }).click();
    await removeAll.click();
    await expect.poll(async () => (await draft(page)).backpack.length).toBe(200);
    const removed = await draft(page);
    expect(removed.backpack.filter((entry) => entry.kind === "ITEM")).toEqual([
        expect.objectContaining({ equipment: helmet }),
    ]);
    await page
        .getByRole("button", { name: "Cofnij: Zdejmij wszystkie przedmioty", exact: true })
        .click();
    await expect.poll(async () => (await draft(page)).backpack.length).toBe(199);
    expect((await draft(page)).requestData.slots.helmet).toEqual(helmet);
});

test("undo cannot consume a removed drif after its level has been edited in the backpack", async ({
    page,
}) => {
    await initialize(page, []);
    await page.setViewportSize({ width: 1800, height: 1100 });
    await page.goto("/kreator?ui=desktop");
    const remove = "Zdejmij wszystkie drify";
    await page.getByRole("button", { name: remove, exact: true }).click();
    await expect.poll(async () => (await draft(page)).backpack.length).toBe(1);
    await page.getByRole("button", { name: "Plecak W.I.P", exact: true }).click();
    await page.getByLabel("Edytor plecaka").getByLabel("Poziom", { exact: true }).selectOption("3");
    await expect.poll(async () => (await draft(page)).backpack[0].level).toBe(3);
    const edited = await draft(page);
    await page.getByRole("button", { name: "Postać", exact: true }).click();
    await expect(
        page.getByRole("button", { name: `Cofnij: ${remove}`, exact: true })
    ).toBeDisabled();
    expect(await draft(page)).toEqual(edited);
});

for (const occupied of [false, true]) {
    test(`database drag into a full backpack ${occupied ? "rejects a socket replacement" : "fills a free socket without creating a loose stone"}`, async ({
        page,
    }) => {
        const equipment = {
            ...helmet,
            drifIds: ["60", null, null],
            ...(occupied ? { orbIds: ["50"], orbLevels: [1] } : {}),
        };
        await initialize(page, [{ id: "target", kind: "ITEM", equipment }, ...inventory(199)]);
        await openBackpack(page);
        const before = await draft(page);
        const database = page.locator(".item-database-theme");
        await database.getByRole("button", { name: "Orby", exact: true }).click();
        await database
            .getByRole("button", { name: "Szczegóły: Ochrona SUBORB", exact: true })
            .last()
            .dragTo(page.locator(".backpack-grid .equipment-slot-overview-item"));
        if (occupied) {
            await expect(page.getByRole("alert")).toContainText(/200/);
            expect(await draft(page)).toEqual(before);
        } else {
            await expect(
                page
                    .locator(".backpack-grid .equipment-slot-overview")
                    .getByLabel("Umieszczone orby")
            ).toContainText("Ochrona");
            await expect
                .poll(async () => (await draft(page)).backpack[0].equipment.orbIds)
                .toEqual(["50"]);
            const applied = await draft(page);
            expect(applied.backpack).toHaveLength(200);
            expect(applied.backpack.slice(1)).toEqual(before.backpack.slice(1));
            expect(applied.requestData).toEqual(before.requestData);
            await page.reload();
            await page.getByRole("button", { name: "Plecak W.I.P", exact: true }).click();
            await expect(
                page
                    .locator(".backpack-grid .equipment-slot-overview")
                    .getByLabel("Umieszczone orby")
            ).toContainText("Ochrona");
            expect((await draft(page)).backpack).toEqual(applied.backpack);
        }
    });
}

const result = () => ({
    optimizedSetup: { slots: { helmet: { ...helmet, drifLevels: { 0: 3 } } }, characterStats: {} },
    targetSetup: { slots: { helmet: { ...helmet, drifLevels: { 0: 6 } } }, characterStats: {} },
    backpackDrifUsages: [{ entryId: "selected", slotKey: "helmet", drifIndex: 0 }],
    calculationResult: { stats: { CRITICAL_CHANCE: "12%" } },
    summary: {
        success: true,
        outcome: "VALID_BUILD",
        message: "Poprawny wynik.",
        nextVariants: [],
    },
});
const configureOptimizer = async (page, layout) => {
    await page.setViewportSize(
        layout === "mobile" ? { width: 320, height: 740 } : { width: 1800, height: 1100 }
    );
    await page.goto(`/optymalizator?ui=${layout}`);
    if (layout === "mobile") {
        await page.getByLabel("Tryb optymalizatora").selectOption("ADVANCED");
        await page.getByText("Opcje i warianty", { exact: true }).click();
    } else await page.getByRole("button", { name: "Zaawansowany", exact: true }).click();
    await page.getByRole("checkbox", { name: "Użyj drifów z plecaka", exact: true }).check();
    if (layout === "mobile") {
        await page.getByRole("button", { name: "＋ Dodaj cel", exact: true }).click();
        await page.getByRole("button", { name: "Szansa na krytyk", exact: true }).click();
    } else
        await page.locator(".optimizer-bonus-card").filter({ hasText: "Szansa na krytyk" }).click();
};

const invalidResults = [
    {
        name: "duplicate consumption",
        corrupt: (value) => value.backpackDrifUsages.push({ ...value.backpackDrifUsages[0] }),
        message: /nie odpowiada zaznaczonym drifom/,
    },
    {
        name: "modified stars",
        corrupt: (value) => {
            value.optimizedSetup.slots.helmet.itemStars = 8;
        },
        message: /zmienia przedmiot, gwiazdki lub orby/,
    },
    {
        name: "wrong owned level",
        corrupt: (value) => {
            value.optimizedSetup.slots.helmet.drifLevels[0] = 4;
        },
        message: /nie odpowiada zaznaczonym drifom/,
    },
    {
        name: "invalid target level",
        corrupt: (value) => {
            value.targetSetup.slots.helmet.drifLevels[0] = 21;
        },
        message: /poziom/i,
    },
    {
        name: "missing consumption metadata",
        corrupt: (value) => {
            delete value.backpackDrifUsages;
        },
        message: /listy użytych drifów/,
    },
];
for (const { name, corrupt, message } of invalidResults) {
    test(`optimizer rejects ${name} without consuming stock and accepts a valid retry`, async ({
        page,
    }) => {
        await initialize(page, [stone("selected", { sendToBackend: true }), stone("unselected")]);
        let calls = 0;
        await page.route("**/api/optimizer/drifs", (route) => {
            const response = result();
            if (calls++ === 0) corrupt(response);
            return route.fulfill({ json: response });
        });
        await configureOptimizer(page, "desktop");
        const before = await draft(page);
        const run = page.getByRole("button", {
            name: /Uruchom optymalizację|Optymalizuj ponownie/i,
        });
        await run.click();
        await expect(page.getByText(message)).toBeVisible();
        expect(await draft(page)).toEqual(before);
        await run.click();
        await expect
            .poll(async () => (await draft(page)).requestData.slots.helmet.drifLevels[0])
            .toBe(3);
        const applied = await draft(page);
        expect(applied.backpack).toHaveLength(2);
        expect(applied.backpack.some((entry) => entry.id === "selected")).toBe(false);
        expect(applied.backpack.find((entry) => entry.id === "unselected")).toEqual(
            stone("unselected")
        );
        expect(applied.backpack.find((entry) => entry.level === 2)).toEqual(
            expect.objectContaining({ kind: "DRIF", templateId: "60" })
        );
        expect(calls).toBe(2);
    });
}

test("mobile rejects a result changing a locked drif and keeps the backpack after reload", async ({
    page,
}) => {
    await initialize(page, [stone("selected", { sendToBackend: true })], {
        lockedDrifs: { helmet: [0] },
    });
    await page.route("**/api/optimizer/drifs", (route) => route.fulfill({ json: result() }));
    await configureOptimizer(page, "mobile");
    const before = await draft(page);
    await page.getByRole("button", { name: /Uruchom optymalizację/i }).click();
    await page.getByRole("button", { name: "Pokaż wynik →", exact: true }).click();
    await expect(page.getByText(/narusza blokadę drifa/)).toBeVisible();
    expect(await draft(page)).toEqual(before);
    await page.reload();
    await expect(page.getByLabel("Tryb optymalizatora")).toBeVisible();
    expect(await draft(page)).toEqual(before);
});

test("optimizer rejects a final transfer exceeding 200 slots without partially publishing gear", async ({
    page,
}) => {
    await initialize(page, [stone("selected", { sendToBackend: true }), ...inventory(199)], {
        requestData: {
            slots: { helmet, boots: { ...helmet, itemId: "5" } },
            characterStats: {},
        },
    });
    await page.route("**/api/optimizer/drifs", (route) => {
        const response = result();
        const boots = { ...helmet, itemId: "5", drifIds: [], drifLevels: {} };
        response.optimizedSetup.slots.boots = boots;
        response.targetSetup.slots.boots = boots;
        return route.fulfill({ json: response });
    });
    await configureOptimizer(page, "desktop");
    const before = await draft(page);
    await page.getByRole("button", { name: /Uruchom optymalizację/i }).click();
    await expect(page.getByText(/Brak miejsca na zdjęte drify/)).toBeVisible();
    expect(await draft(page)).toEqual(before);
});
