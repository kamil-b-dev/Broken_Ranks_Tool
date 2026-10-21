import { expect, test } from "@playwright/test";
import { builderCatalog } from "../src/test/fixtures/equipment/builderCatalog.js";

const boots = {
    ...builderCatalog.items.find((item) => item.category === "BOOTS"),
    id: 19,
    name: "Envile",
    capacity: 24,
};
const catalog = {
    ...builderCatalog,
    items: builderCatalog.items.map((item) => (item.category === "BOOTS" ? boots : item)),
    drifs: [
        {
            id: 70,
            name: "Jorn",
            bonusType: "PERCENTAGE_DAMAGE_REDUCTION",
            size: "BIDRIF",
            category: "DEFENSIVE",
        },
        { id: 10, name: "Eras", bonusType: "STAMINA_REGEN", size: "BIDRIF", category: "UTILITY" },
        {
            id: 20,
            name: "Lun",
            bonusType: "CC_PROTECTION",
            size: "ARCYDRIF",
            category: "DEFENSIVE",
        },
        {
            id: 104,
            name: "Dur",
            bonusType: "DOUBLE_HIT_ROLL_CHANCE",
            size: "ARCYDRIF",
            category: "OFFENSIVE",
        },
        {
            id: 52,
            name: "Alorn",
            bonusType: "DAMAGE_REDUCTION",
            size: "ARCYDRIF",
            category: "DEFENSIVE",
        },
    ],
    gameRules: {
        ...builderCatalog.gameRules,
        drifBasePowers: {
            PERCENTAGE_DAMAGE_REDUCTION: 1,
            STAMINA_REGEN: 1,
            CC_PROTECTION: 1,
            DOUBLE_HIT_ROLL_CHANCE: 2,
            DAMAGE_REDUCTION: 4,
        },
    },
};
const equipped = {
    itemId: "19",
    itemStars: 4,
    orbIds: [],
    orbLevels: [],
    drifIds: ["104", "52"],
    drifLevels: { 0: 21, 1: 21 },
};
const replacement = {
    itemId: "19",
    itemStars: 9,
    orbIds: [],
    orbLevels: [],
    drifIds: ["70", "10", "20"],
    drifLevels: { 0: 10, 1: 11, 2: 21 },
};

for (const [name, selector] of [
    ["item icon", ".equipment-slot-icon"],
    ["item name", ".equipment-slot-overview-item"],
    ["drif text", ".equipment-slot-drif > span"],
]) {
    test(`moves screenshot boots by dragging their ${name} onto the boots slot`, async ({
        page,
    }) => {
        await page.setViewportSize({ width: 1800, height: 1100 });
        await page.addInitScript(
            (value) =>
                localStorage.setItem(
                    "broken-ranks-tool.equipment-draft.v2",
                    JSON.stringify({ version: 2, value })
                ),
            {
                requestData: { slots: { boots: equipped }, characterStats: {} },
                characterConfig: null,
                lockedSlots: [],
                lockedDrifs: {},
                backpack: [{ id: "boots", kind: "ITEM", equipment: replacement }],
            }
        );
        await page.route("**/api/initial-data", (route) => route.fulfill({ json: catalog }));
        await page.goto("/builder?ui=desktop");
        await page.locator(".equipment-ring-slot-boots").click();
        await page
            .getByRole("group", { name: "Źródło wyposażenia" })
            .getByRole("button", { name: "Plecak", exact: true })
            .click();
        const source = page.getByRole("region", { name: "Plecak do wyposażenia" });
        const target = page.locator(".equipment-ring-slot-boots");
        await target.evaluate((element) => {
            const bottom = element.getBoundingClientRect().bottom;
            window.scrollBy({
                top: Math.max(0, bottom - window.innerHeight + 24),
                behavior: "instant",
            });
        });
        await expect(source.locator(selector).first()).toBeInViewport();
        const from = await source.locator(selector).first().boundingBox();
        const to = await target.boundingBox();
        await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
        await page.mouse.down();
        await page.mouse.move(from.x + from.width / 2 + 12, from.y + from.height / 2 + 12, {
            steps: 4,
        });
        await expect(target).toHaveClass(/equipment-drop-eligible/);
        await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 20 });
        await page.mouse.up();
        await expect(target.getByLabel("9 z 9 gwiazdek")).toBeVisible();
        await expect(
            page.getByLabel("Edytor wybranego slotu").getByLabel("Wybierz poziom drifa 1")
        ).toHaveValue("10");
        await expect(source.getByLabel("4 z 9 gwiazdek")).toBeVisible();
    });
}
