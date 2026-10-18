import { expect, test } from "@playwright/test";
import { builderCatalog } from "../src/test/fixtures/equipment/builderCatalog.js";
import { mobileDevice } from "./mobile-device";

const catalog = {
    ...builderCatalog,
    items: builderCatalog.items.map((item) =>
        item.id === 1 ? { ...item, rarity: "LEGENDARY" } : item
    ),
    orbs: [
        ...builderCatalog.orbs,
        { id: 51, name: "Atak", bonusType: "ATTACK", category: "OFFENSIVE", size: "BIORB" },
    ],
    drifs: [
        ...builderCatalog.drifs,
        { id: 61, name: "Ling", bonusType: "MANA_REGEN", category: "UTILITY", size: "BIDRIF" },
    ],
    gameRules: {
        ...builderCatalog.gameRules,
        drifBasePowers: { CRITICAL_CHANCE: 4, MANA_REGEN: 2 },
    },
};
const helmet = {
    itemId: "1",
    itemStars: 8,
    orbIds: ["50", "51"],
    orbLevels: [1, 3],
    drifIds: ["60", null, "61"],
    drifLevels: { 0: 6, 2: 4 },
};
const boots = {
    itemId: "5",
    itemStars: 7,
    orbIds: [],
    orbLevels: [],
    drifIds: ["60"],
    drifLevels: { 0: 2 },
};
const stored = (page) =>
    page.evaluate(
        () =>
            JSON.parse(
                localStorage.getItem("broken-ranks-tool.equipment-draft.v3") ||
                    localStorage.getItem("broken-ranks-tool.equipment-draft.v2")
            ).value
    );
const setup = async (page) => {
    await page.addInitScript(
        (value) => {
            if (!(
                localStorage.getItem("broken-ranks-tool.equipment-draft.v3") ||
                localStorage.getItem("broken-ranks-tool.equipment-draft.v2")
            ))
                localStorage.setItem(
                    "broken-ranks-tool.equipment-draft.v2",
                    JSON.stringify({ version: 2, value })
                );
        },
        {
            requestData: { slots: { helmet, boots }, characterStats: {} },
            backpack: [],
            characterConfig: null,
            lockedSlots: ["boots"],
            lockedDrifs: { helmet: [0, 2] },
        }
    );
    await page.route("**/api/initial-data", (route) => route.fulfill({ json: catalog }));
    await page.route("**/api/calculator/calculate", (route) =>
        route.fulfill({ json: { stats: { Siła: 42 } } })
    );
};

for (const [kind, label, count] of [
    ["ITEM", "Zdejmij wszystkie przedmioty", 2],
    ["ORB", "Zdejmij wszystkie orby", 2],
    ["DRIF", "Zdejmij wszystkie drify", 3],
]) {
    test(`desktop removes all ${kind} into the backpack and restores them with the arrow`, async ({
        page,
    }) => {
        await setup(page);
        await page.setViewportSize({ width: 1800, height: 1100 });
        await page.goto("/builder?ui=desktop");
        await expect(page.locator(".equipment-ring-slot-helmet")).toBeVisible({ timeout: 20000 });
        const undo = page.getByRole("button", { name: `Cofnij: ${label}`, exact: true });
        await expect(undo).toBeDisabled();
        await page.getByRole("button", { name: label, exact: true }).click();
        await expect.poll(async () => (await stored(page)).backpack.length).toBe(count);
        const removed = await stored(page);
        expect(removed.backpack.every((entry) => entry.kind === kind)).toBe(true);
        if (kind === "ITEM")
            expect(
                removed.backpack.find((entry) => entry.equipment.itemId === "1").equipment
            ).toEqual(helmet);
        if (kind === "ORB") expect(removed.backpack.map((entry) => entry.level)).toEqual([1, 3]);
        if (kind === "DRIF")
            expect(removed.backpack.map((entry) => entry.level)).toEqual([6, 4, 2]);
        if (kind === "ITEM") {
            await page
                .getByRole("group", { name: "Widok ekwipunku" })
                .or(page.getByRole("navigation", { name: "Sekcje kreatora" }))
                .getByRole("button", { name: "Plecak", exact: true })
                .click();
            await page
                .locator(".backpack-grid .equipment-slot-overview")
                .filter({ hasText: "Buty podróżnika" })
                .click();
            await expect
                .poll(
                    async () =>
                        (await stored(page)).backpack.find(
                            (entry) => entry.equipment.itemId === "5"
                        ).equipment.drifIds.length
                )
                .toBe(3);
            await page.getByRole("button", { name: "Postać", exact: true }).click();
        }
        await expect(undo).toBeEnabled();
        await undo.click();
        await expect.poll(async () => (await stored(page)).backpack.length).toBe(0);
        expect((await stored(page)).requestData.slots.helmet).toEqual(helmet);
        expect((await stored(page)).lockedDrifs.helmet).toEqual([0, 2]);
        expect((await stored(page)).lockedSlots).toEqual(["boots"]);
        await expect(undo).toBeDisabled();
    });
}

test("desktop removes individual gems and keeps undo available after editor synchronization", async ({
    page,
}) => {
    await setup(page);
    await page.setViewportSize({ width: 1800, height: 1100 });
    await page.goto("/builder?ui=desktop");
    await page.locator(".equipment-ring-slot-helmet").click();
    await expect(
        page.getByRole("button", { name: "Zdejmij orb 1 do plecaka", exact: true })
    ).toHaveText("");
    const alignedRows = await page
        .locator(".gear-slot-editor .equipment-stone-row")
        .evaluateAll((rows) =>
            rows.map((row) => {
                const fields = row.firstElementChild.getBoundingClientRect();
                const actions = row
                    .querySelector(".equipment-removal-action")
                    .getBoundingClientRect();
                return (
                    Math.abs(fields.y + fields.height / 2 - actions.y - actions.height / 2) < 1 &&
                    actions.x + actions.width <= row.getBoundingClientRect().right + 1
                );
            })
        );
    expect(alignedRows).toEqual([true, true, true, true, true]);
    await page.getByRole("button", { name: "Zdejmij orb 1 do plecaka", exact: true }).click();
    await expect
        .poll(async () => (await stored(page)).requestData.slots.helmet.orbIds)
        .toEqual(["51"]);
    await expect.poll(async () => (await stored(page)).backpack[0]?.level).toBe(1);
    await page
        .getByRole("button", { name: "Cofnij: Zdejmij orb 1 do plecaka", exact: true })
        .click();
    await expect
        .poll(async () => (await stored(page)).requestData.slots.helmet.orbLevels)
        .toEqual([1, 3]);
    await page.getByRole("button", { name: "Zdejmij drif 3 do plecaka", exact: true }).click();
    await expect.poll(async () => (await stored(page)).backpack[0]?.level).toBe(4);
    await expect(page.getByLabel("Wybierz wielkość drifa 3")).toHaveValue("");
    await page
        .locator(".selected-slot-editor")
        .screenshot({ path: "../tmp/equipment-removal-desktop.png" });
    await page
        .getByRole("button", { name: "Cofnij: Zdejmij drif 3 do plecaka", exact: true })
        .click();
    await expect(page.getByLabel("Wybierz wielkość drifa 3")).toHaveValue("61");
    await expect
        .poll(async () => (await stored(page)).requestData.slots.helmet.drifLevels)
        .toEqual({ 0: 6, 2: 4 });
    await page.reload();
    expect((await stored(page)).backpack).toEqual([]);
    await expect(
        page.getByRole("button", { name: "Cofnij: Zdejmij wszystkie przedmioty", exact: true })
    ).toBeDisabled();
});

test.describe("touch removal actions", () => {
    test.use(mobileDevice);
    test("moves gems and complete equipment with guarded arrow undo", async ({ page }) => {
        await setup(page);
        await page.setViewportSize({ width: 320, height: 740 });
        await page.goto("/builder");
        await page.getByRole("button", { name: "Zdejmij wszystkie przedmioty", exact: true }).tap();
        await expect.poll(async () => (await stored(page)).backpack.length).toBe(2);
        await page
            .getByRole("group", { name: "Widok ekwipunku" })
            .or(page.getByRole("navigation", { name: "Sekcje kreatora" }))
            .getByRole("button", { name: "Plecak", exact: true })
            .tap();
        await page
            .locator(".backpack-grid .equipment-slot-overview")
            .filter({ hasText: "Buty podróżnika" })
            .tap();
        await expect
            .poll(
                async () =>
                    (await stored(page)).backpack.find((entry) => entry.equipment.itemId === "5")
                        .equipment.drifIds.length
            )
            .toBe(3);
        await page.getByRole("button", { name: "Ekwipunek", exact: true }).tap();
        await page
            .getByRole("button", { name: "Cofnij: Zdejmij wszystkie przedmioty", exact: true })
            .tap();
        await expect.poll(async () => (await stored(page)).backpack.length).toBe(0);
        await page.getByRole("button", { name: "Edytuj slot: Hełm", exact: true }).tap();
        for (const label of ["Zdejmij orb 2 do plecaka", "Zdejmij drif 1 do plecaka"]) {
            await page.getByRole("button", { name: label, exact: true }).tap();
            await expect.poll(async () => (await stored(page)).backpack.length).toBe(1);
            await page.getByRole("button", { name: `Cofnij: ${label}`, exact: true }).tap();
            await expect.poll(async () => (await stored(page)).backpack.length).toBe(0);
        }
        await page.screenshot({ path: "../tmp/equipment-removal-mobile.png", fullPage: true });
        expect((await stored(page)).requestData.slots.helmet).toEqual(helmet);
        await expect(page.locator("html")).toHaveJSProperty("scrollWidth", 320);
    });
});
