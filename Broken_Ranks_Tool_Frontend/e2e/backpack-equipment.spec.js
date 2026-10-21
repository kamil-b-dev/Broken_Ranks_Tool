import { expect, test } from "@playwright/test";
import { builderCatalog } from "../src/test/fixtures/equipment/builderCatalog.js";
import { mobileDevice } from "./mobile-device";

const catalog = {
    ...builderCatalog,
    orbs: [...builderCatalog.orbs, { ...builderCatalog.orbs[0], id: 51, size: "BIORB" }],
    drifs: [
        ...builderCatalog.drifs,
        { ...builderCatalog.drifs[0], id: 61, size: "ARCYDRIF" },
        {
            ...builderCatalog.drifs[0],
            id: 62,
            name: "Regeneracja",
            bonusType: "MANA_REGEN",
            category: "UTILITY",
        },
    ],
    gameRules: {
        ...builderCatalog.gameRules,
        drifBasePowers: { CRITICAL_CHANCE: 4, MANA_REGEN: 2 },
        bonusTranslations: {
            ...builderCatalog.gameRules.bonusTranslations,
            MANA_REGEN: "Regeneracja many",
        },
    },
};
const oldEquipment = {
    itemId: "1",
    itemStars: 1,
    drifIds: ["60"],
    drifLevels: { 0: 2 },
    orbIds: [],
    orbLevels: [],
};
const configured = {
    ...oldEquipment,
    itemStars: 8,
    drifLevels: { 0: 6 },
    orbIds: ["50"],
    orbLevels: [1],
};
const inventory = [
    { id: "configured", kind: "ITEM", equipment: configured },
    { id: "utility", kind: "DRIF", templateId: "62", level: 6 },
    { id: "larger-orb", kind: "ORB", templateId: "51", level: 3 },
    { id: "too-powerful", kind: "DRIF", templateId: "61", level: 21 },
];
const draft = (page) =>
    page.evaluate(
        () =>
            JSON.parse(
                localStorage.getItem("broken-ranks-tool.equipment-draft.v3") ||
                    localStorage.getItem("broken-ranks-tool.equipment-draft.v2")
            ).value
    );

test.beforeEach(async ({ page }) => {
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
            requestData: { slots: { helmet: oldEquipment }, characterStats: {} },
            backpack: inventory,
            characterConfig: null,
            lockedSlots: [],
            lockedDrifs: {},
        }
    );
    await page.route("**/api/initial-data", (route) => route.fulfill({ json: catalog }));
    await page.route("**/api/calculator/calculate", (route) =>
        route.fulfill({ json: { stats: { Siła: 10 } } })
    );
});

test("desktop drags configured items and leveled gems from the backpack and returns replacements", async ({
    page,
}) => {
    await page.setViewportSize({ width: 1800, height: 1100 });
    await page.goto("/builder?ui=desktop");
    await page
        .getByRole("group", { name: "Źródło wyposażenia" })
        .getByRole("button", { name: "Plecak", exact: true })
        .click();
    const source = page.getByRole("region", { name: "Plecak do wyposażenia" });
    const helmet = page.locator(".equipment-ring-slot-helmet");
    await source.locator(".backpack-card").filter({ hasText: "Hełm podróżnika" }).dragTo(helmet);
    await expect.poll(async () => (await draft(page)).requestData.slots.helmet.itemStars).toBe(8);
    await expect
        .poll(async () => (await draft(page)).backpack.some((entry) => entry.id === "configured"))
        .toBe(false);
    const swapped = (await draft(page)).backpack.find((entry) => entry.kind === "ITEM");
    expect(swapped.equipment.itemStars).toBe(1);
    expect(swapped.equipment.drifLevels[0]).toBe(2);
    const editor = page.getByLabel("Edytor wybranego slotu");
    await expect(editor.getByLabel("Wybierz poziom drifa 1")).toHaveValue("6");
    const orbZone = editor.locator(".orb-selector-row").first();
    await source.locator(".backpack-card").filter({ hasText: "BIORB" }).dragTo(orbZone);
    await expect
        .poll(async () => (await draft(page)).requestData.slots.helmet.orbLevels[0])
        .toBe(3);
    const secondDrif = editor.getByLabel("Wybierz rodzaj drifa 2").locator("..");
    await source.locator(".backpack-card").filter({ hasText: "Regeneracja" }).dragTo(secondDrif);
    await expect
        .poll(async () => (await draft(page)).requestData.slots.helmet.drifLevels[1])
        .toBe(6);
    const after = await draft(page);
    expect(after.requestData.slots.helmet.drifIds.filter(Boolean)).toEqual(["60", "62"]);
    expect(after.backpack.find((entry) => entry.kind === "ORB")).toMatchObject({
        templateId: "50",
        level: 1,
    });
    await expect(source.locator(".backpack-card").filter({ hasText: "poz. 21" })).toHaveCount(1);
    await source
        .locator(".backpack-card")
        .filter({ hasText: "poz. 21" })
        .getByRole("button")
        .first()
        .click();
    await expect(source.getByRole("button", { name: "Załóż w slocie Hełm" })).toBeDisabled();
    await page.screenshot({ path: "../tmp/backpack-equipment-desktop.png", fullPage: true });
    await page.reload();
    await expect
        .poll(async () => (await draft(page)).requestData.slots.helmet.drifLevels[1])
        .toBe(6);
    expect((await draft(page)).backpack).toEqual(after.backpack);
});

test.describe("mobile backpack equipment", () => {
    test.use(mobileDevice);
    test("chooses a configured item and leveled stones from backpack lists at 320px", async ({
        page,
    }) => {
        await page.setViewportSize({ width: 320, height: 844 });
        await page.goto("/builder");
        await page.getByRole("button", { name: "Edytuj slot: Hełm", exact: true }).click();
        await page.getByRole("button", { name: "Zmień przedmiot", exact: true }).click();
        const dialog = page.getByRole("dialog");
        await dialog.getByRole("button", { name: "Plecak", exact: true }).click();
        await expect(dialog.getByLabel("Umieszczone orby")).toContainText("Ochrona");
        await expect(dialog.getByLabel("Umieszczone drify")).toContainText("Band");
        await page.screenshot({
            path: "../tmp/backpack-equipment-mobile-picker.png",
            fullPage: true,
        });
        await dialog.getByRole("button", { name: /Przedmiot 1 z plecaka/ }).click();
        await expect(page.getByRole("dialog")).toHaveCount(0);
        await expect(page.getByLabel("Gwiazdki", { exact: true })).toHaveValue("8");
        await expect(page.getByLabel("Wybierz poziom drifa 1")).toHaveValue("6");
        await page.getByLabel("Orb 1 z plecaka").selectOption("larger-orb");
        await expect(page.getByLabel("Wybierz poziom orba")).toHaveValue("3");
        await page.getByLabel("Drif 2 z plecaka").selectOption("utility");
        await expect(page.getByLabel("Wybierz poziom drifa 2")).toHaveValue("6");
        await expect(
            page.getByLabel("Drif 1 z plecaka").locator('option[value="too-powerful"]')
        ).toHaveAttribute("disabled", "");
        await expect
            .poll(async () => (await draft(page)).backpack.some((entry) => entry.id === "utility"))
            .toBe(false);
        const stored = await draft(page);
        expect(stored.backpack.find((entry) => entry.kind === "ITEM").equipment.itemStars).toBe(1);
        expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
        ).toBe(true);
        await page.getByRole("heading", { name: "Hełm podróżnika", exact: true }).click();
        await page.screenshot({
            path: "../tmp/backpack-equipment-mobile-editor.png",
            fullPage: true,
        });
        await page.reload();
        await expect(page.getByLabel("Gwiazdki", { exact: true })).toHaveValue("8");
        expect((await draft(page)).backpack).toEqual(stored.backpack);
    });
});
