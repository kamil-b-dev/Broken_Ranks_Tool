import { expect, test } from "@playwright/test";
import { builderCatalog } from "../src/test/fixtures/equipment/builderCatalog.js";

const catalog = {
    ...builderCatalog,
    drifs: [
        ...builderCatalog.drifs,
        { ...builderCatalog.drifs[0], id: 61, size: "ARCYDRIF" },
        {
            ...builderCatalog.drifs[0],
            id: 62,
            name: "Ann",
            bonusType: "MANA_REGEN",
            category: "UTILITY",
        },
    ],
    gameRules: {
        ...builderCatalog.gameRules,
        drifBasePowers: { CRITICAL_CHANCE: 4, MANA_REGEN: 1 },
    },
};
const equipped = {
    itemId: "1",
    itemStars: 1,
    orbIds: [],
    orbLevels: [],
    drifIds: ["60"],
    drifLevels: { 0: 2 },
};
const inventoryItem = {
    itemId: "1",
    itemStars: 9,
    orbIds: [],
    orbLevels: [],
    drifIds: ["61"],
    drifLevels: { 0: 11 },
};
const entries = [
    { id: "target", kind: "ITEM", equipment: inventoryItem },
    { id: "band", kind: "DRIF", templateId: "60", level: 6 },
    { id: "ann", kind: "DRIF", templateId: "62", level: 6 },
    { id: "orb", kind: "ORB", templateId: "50", level: 1 },
];
const draft = (page) =>
    page.evaluate(
        () => JSON.parse(localStorage.getItem("broken-ranks-tool.equipment-draft.v2")).value
    );

test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1800, height: 1100 });
    await page.addInitScript(
        (value) => {
            if (!localStorage.getItem("broken-ranks-tool.equipment-draft.v2"))
                localStorage.setItem(
                    "broken-ranks-tool.equipment-draft.v2",
                    JSON.stringify({ version: 2, value })
                );
        },
        {
            requestData: { slots: { helmet: equipped }, characterStats: {} },
            backpack: entries,
            characterConfig: null,
            lockedSlots: [],
            lockedDrifs: {},
        }
    );
    await page.route("**/api/initial-data", (route) => route.fulfill({ json: catalog }));
    await page.goto("/kreator?ui=desktop");
    await page.getByRole("button", { name: "Plecak W.I.P", exact: true }).click();
});

test("moves stones from the left backpack source into item cards and refreshes their selected editor", async ({
    page,
}) => {
    await page
        .getByRole("group", { name: "Źródło wyposażenia" })
        .getByRole("button", { name: "Plecak", exact: true })
        .click();
    const source = page.getByRole("region", { name: "Plecak do wyposażenia" });
    const item = page.locator(".backpack-grid .equipment-slot-overview");
    await item.click();
    await source
        .getByRole("button", { name: /Band · SUBDRIF/ })
        .dragTo(item.locator(".equipment-slot-overview-item"));
    await expect(
        page.getByLabel("Edytor plecaka").getByLabel("Wybierz poziom drifa 1")
    ).toHaveValue("6");
    await expect
        .poll(async () => (await draft(page)).backpack.some((entry) => entry.id === "band"))
        .toBe(false);
    await source
        .getByRole("button", { name: /Ochrona · SUBORB/ })
        .dragTo(item.locator(".equipment-slot-overview-item"));
    await expect(item.getByLabel("Umieszczone orby")).toContainText("Ochrona");
    await expect
        .poll(async () => (await draft(page)).backpack.some((entry) => entry.id === "orb"))
        .toBe(false);
    const stored = await draft(page);
    expect(stored.requestData.slots.helmet.itemStars).toBe(1);
    expect(stored.requestData.slots.helmet.drifLevels[0]).toBe(2);
    expect(
        stored.backpack.find((entry) => entry.kind === "DRIF" && entry.templateId === "61")
    ).toMatchObject({ level: 11 });
    await page.reload();
    await page.getByRole("button", { name: "Plecak W.I.P", exact: true }).click();
    await expect(
        page.locator(".backpack-grid .equipment-slot-overview").getByLabel("Umieszczone orby")
    ).toContainText("Ochrona");
    expect((await draft(page)).backpack).toEqual(stored.backpack);
});

test("moves inventory-grid stones while sorted and accepts an explicit socket in the right editor", async ({
    page,
}) => {
    await page.getByLabel("Sortuj według").selectOption("name");
    const item = page.locator(".backpack-grid .equipment-slot-overview");
    await page
        .locator(".backpack-grid")
        .getByRole("button", { name: /Drif Band/ })
        .dragTo(item.locator(".equipment-slot-overview-item"));
    await expect(item.getByLabel("Umieszczone drify")).toContainText("Band6");
    await page
        .getByRole("group", { name: "Źródło wyposażenia" })
        .getByRole("button", { name: "Plecak", exact: true })
        .click();
    await item.click();
    const source = page.getByRole("region", { name: "Plecak do wyposażenia" });
    const editor = page.getByLabel("Edytor plecaka");
    await source
        .getByRole("button", { name: /Ann · SUBDRIF/ })
        .dragTo(editor.getByLabel("Wybierz rodzaj drifa 2").locator(".."));
    await expect(editor.getByLabel("Wybierz poziom drifa 2")).toHaveValue("6");
    await expect
        .poll(async () =>
            (await draft(page)).backpack
                .find((entry) => entry.id === "target")
                .equipment.drifIds.filter(Boolean)
        )
        .toEqual(["60", "62"]);
    const target = (await draft(page)).backpack.find((entry) => entry.id === "target");
    expect(target.equipment.drifIds.filter(Boolean)).toEqual(["60", "62"]);
    expect(target.equipment.drifLevels).toEqual({ 0: 6, 1: 6 });
});

test("copies a database stone directly into an inventory item instead of adding a loose occurrence", async ({
    page,
}) => {
    const database = page.locator(".item-database-theme");
    await database.getByRole("button", { name: "Orby", exact: true }).click();
    await database
        .getByRole("button", { name: "Szczegóły: Ochrona SUBORB", exact: true })
        .last()
        .dragTo(page.locator(".backpack-grid .equipment-slot-overview-item"));
    await expect(
        page.locator(".backpack-grid .equipment-slot-overview").getByLabel("Umieszczone orby")
    ).toContainText("Ochrona");
    const stored = await draft(page);
    expect(stored.backpack).toHaveLength(entries.length);
    expect(stored.backpack.find((entry) => entry.id === "orb")).toEqual(entries[3]);
    expect(stored.requestData.slots.helmet.orbIds).toEqual([]);
});
