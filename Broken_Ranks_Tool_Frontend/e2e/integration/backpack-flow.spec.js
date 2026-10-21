import { expect, test } from "@playwright/test";
import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import { mobileDevice } from "../mobile-device";

const calculationPath = "/api/calculator/calculate";
const isCalculation = (response) =>
    response.url().endsWith(calculationPath) && response.request().method() === "POST";
const slot = (item, changes = {}) => ({
    itemId: String(item.id),
    itemStars: 1,
    orbIds: [],
    orbLevels: [],
    drifIds: [],
    drifLevels: {},
    ...changes,
});
const canonicalSlot = (value) =>
    value
        ? {
              itemId: Number(value.itemId),
              itemStars: value.itemStars,
              drifs: (value.drifIds || []).flatMap((id, index) =>
                  id
                      ? [{ index, id: Number(id), level: Number(value.drifLevels?.[index] ?? 1) }]
                      : []
              ),
              orbs: (value.orbIds || []).flatMap((id, index) =>
                  id
                      ? [{ index, id: Number(id), level: Number(value.orbLevels?.[index] ?? 1) }]
                      : []
              ),
          }
        : null;
const draft = (page) =>
    page.evaluate(
        () =>
            JSON.parse(
                localStorage.getItem("broken-ranks-tool.equipment-draft.v3") ||
                    localStorage.getItem("broken-ranks-tool.equipment-draft.v2")
            ).value
    );
const statNumber = (value) => Number.parseFloat(String(value).replace(",", "."));
const displayValue = (value) =>
    `${Number(statNumber(value).toFixed(2))}${String(value).includes("%") ? "%" : ""}`;

function createScenario(catalog) {
    const helmets = catalog.items.filter(
        (item) =>
            item.category === "HELMET" &&
            item.rarity === "RARE" &&
            ["X", "XI", "XII"].includes(item.tier) &&
            item.capacity >= 20
    );
    expect(
        helmets.length,
        "Real catalog must contain two ordinary high-tier helmets"
    ).toBeGreaterThanOrEqual(2);
    const drif = (bonusType, size) => {
        const stone = catalog.drifs.find(
            (candidate) => candidate.bonusType === bonusType && candidate.size === size
        );
        expect(stone, `Missing real drif ${bonusType}/${size}`).toBeTruthy();
        return stone;
    };
    const critical = drif("CRITICAL_CHANCE", "SUBDRIF");
    const largerCritical = drif("CRITICAL_CHANCE", "ARCYDRIF");
    const utility = drif("MANA_REGEN", "SUBDRIF");
    const oldOrb = catalog.orbs.find(
        (stone) => stone.category === "DEFENSIVE" && stone.size === "SUBORB"
    );
    const largerOrb = catalog.orbs.find(
        (stone) => stone.bonusType === oldOrb?.bonusType && stone.size === "BIORB"
    );
    expect(oldOrb).toBeTruthy();
    expect(largerOrb).toBeTruthy();
    const oldEquipment = slot(helmets[0], { drifIds: [String(critical.id)], drifLevels: { 0: 2 } });
    const configured = slot(helmets[1], {
        itemStars: 8,
        drifIds: [String(critical.id)],
        drifLevels: { 0: 6 },
        orbIds: [String(oldOrb.id)],
        orbLevels: [1],
    });
    const overloaded = slot(helmets[1], {
        drifIds: [
            largerCritical,
            drif("DOUBLE_ATTACK_CHANCE", "ARCYDRIF"),
            drif("DODGE_CHANCE", "ARCYDRIF"),
        ].map((stone) => String(stone.id)),
        drifLevels: { 0: 21, 1: 21, 2: 21 },
    });
    const overloadPower = overloaded.drifIds.reduce(
        (sum, id) =>
            sum +
            4 *
                catalog.gameRules.drifBasePowers[
                    catalog.drifs.find((stone) => String(stone.id) === id).bonusType
                ],
        0
    );
    expect(overloadPower).toBeGreaterThan(helmets[1].capacity);
    const backpack = [
        { id: "configured", kind: "ITEM", equipment: configured },
        { id: "larger-critical", kind: "DRIF", templateId: String(largerCritical.id), level: 11 },
        { id: "utility", kind: "DRIF", templateId: String(utility.id), level: 6 },
        { id: "larger-orb", kind: "ORB", templateId: String(largerOrb.id), level: 3 },
        { id: "unfinished", kind: "ITEM", equipment: overloaded },
    ];
    return {
        catalog,
        critical,
        largerCritical,
        utility,
        oldOrb,
        largerOrb,
        oldEquipment,
        configured,
        overloaded,
        payload: {
            format: "broken-ranks-tool-build",
            version: 2,
            build: {
                requestData: { slots: { helmet: oldEquipment }, characterStats: {} },
                backpack,
                characterConfig: null,
                lockedSlots: [],
                lockedDrifs: {},
            },
        },
    };
}

async function importScenario(page, scenario, mobile = false) {
    await page.goto(mobile ? "/builder" : "/builder?ui=desktop");
    const calculated = page.waitForResponse(isCalculation);
    if (mobile) {
        await page.locator(".mobile-build-actions > summary").click();
        await expect(page.getByRole("button", { name: "Wczytaj plik buildu" })).toBeEnabled();
    } else {
        await expect(page.getByRole("button", { name: /Wczytaj build/ })).toBeEnabled();
    }
    await page
        .locator('input[type="file"]')
        .first()
        .setInputFiles({
            name: "backpack-integration.json",
            mimeType: "application/json",
            buffer: Buffer.from(JSON.stringify(scenario.payload)),
        });
    const response = await calculated;
    expect(response.status()).toBe(200);
    await expect(page.getByText(/Wczytano build z pliku/)).toBeVisible();
    if (mobile) await page.locator(".mobile-build-actions > summary").click();
    await expect
        .poll(async () => canonicalSlot((await draft(page)).requestData.slots.helmet))
        .toEqual(canonicalSlot(scenario.oldEquipment));
    expect((await draft(page)).backpack.map((entry) => entry.id)).toEqual(
        scenario.payload.build.backpack.map((entry) => entry.id)
    );
    return response.json();
}

async function calculateAndCompare(page, request, scenario, expectedSlot, mobile = false) {
    if (mobile) {
        const back = page.getByRole("button", { name: /Wszystkie sloty/ });
        if (await back.isVisible()) await back.click();
        await page.getByRole("button", { name: "Statystyki", exact: true }).click();
    }
    const responsePromise = page.waitForResponse(isCalculation);
    await page.getByRole("button", { name: "Przelicz statystyki", exact: true }).click();
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    const sent = response.request().postDataJSON();
    expect(Object.keys(sent).sort()).toEqual(["characterStats", "slots"]);
    expect(sent.characterStats).toEqual({});
    expect(canonicalSlot(sent.slots.helmet)).toEqual(canonicalSlot(expectedSlot));
    const result = await response.json();
    const independentlyCalculated = await request.post(calculationPath, {
        data: { slots: { helmet: expectedSlot }, characterStats: {} },
    });
    expect(independentlyCalculated.status()).toBe(200);
    expect(result).toEqual(await independentlyCalculated.json());
    const stats = mobile
        ? page.getByRole("region", { name: "Statystyki buildu" })
        : page.locator(".builder-stats-panel");
    const criticalLabel = scenario.catalog.gameRules.bonusTranslations.CRITICAL_CHANCE;
    await expect(stats.getByText(criticalLabel, { exact: true }).locator("..")).toContainText(
        displayValue(result.stats.CRITICAL_CHANCE)
    );
    return result;
}

let scenario;
test.beforeEach(async ({ request }) => {
    const response = await request.get("/api/initial-data");
    expect(response.status(), "Start the read-only local backend on port 8082").toBe(200);
    const catalog = await response.json();
    expect(catalog.items.length).toBeGreaterThan(100);
    scenario = createScenario(catalog);
});

test("desktop equips a configured backpack item and leveled stones accepted by the real calculator", async ({
    page,
    request,
}) => {
    await page.setViewportSize({ width: 1800, height: 1100 });
    const baseline = await importScenario(page, scenario);
    await page
        .getByRole("group", { name: "Źródło wyposażenia" })
        .getByRole("button", { name: "Plecak", exact: true })
        .click();
    const source = page.getByRole("region", { name: "Plecak do wyposażenia" });
    const configuredCard = source
        .locator(".backpack-card")
        .filter({ has: page.getByLabel("8 z 9 gwiazdek") });
    await configuredCard.dragTo(page.locator(".equipment-ring-slot-helmet"));
    await expect
        .poll(async () => canonicalSlot((await draft(page)).requestData.slots.helmet))
        .toEqual(canonicalSlot(scenario.configured));
    const afterItem = await calculateAndCompare(page, request, scenario, scenario.configured);
    expect(statNumber(afterItem.stats.CRITICAL_CHANCE)).toBeGreaterThan(
        statNumber(baseline.stats.CRITICAL_CHANCE)
    );
    const editor = page.getByLabel("Edytor wybranego slotu");
    await source
        .locator(".backpack-card")
        .filter({ hasText: "ARCYDRIF" })
        .dragTo(editor.getByLabel("Wybierz rodzaj drifa 1").locator(".."));
    await source
        .locator(".backpack-card")
        .filter({ hasText: scenario.utility.name })
        .dragTo(editor.getByLabel("Wybierz rodzaj drifa 2").locator(".."));
    await source
        .locator(".backpack-card")
        .filter({ hasText: "BIORB" })
        .dragTo(editor.locator(".orb-selector-row"));
    const expected = {
        ...scenario.configured,
        drifIds: [String(scenario.largerCritical.id), String(scenario.utility.id)],
        drifLevels: { 0: 11, 1: 6 },
        orbIds: [String(scenario.largerOrb.id)],
        orbLevels: [3],
    };
    await expect
        .poll(async () => canonicalSlot((await draft(page)).requestData.slots.helmet))
        .toEqual(canonicalSlot(expected));
    const calculated = await calculateAndCompare(page, request, scenario, expected);
    expect(statNumber(calculated.stats.CRITICAL_CHANCE)).toBeGreaterThan(
        statNumber(afterItem.stats.CRITICAL_CHANCE)
    );
    expect(calculated.orbBonusTypes).toContain(scenario.largerOrb.bonusType);
    expect(calculated.drifCategories).toMatchObject({
        CRITICAL_CHANCE: "OFFENSIVE",
        MANA_REGEN: "UTILITY",
    });
    const stored = await draft(page);
    expect(
        stored.backpack.some((entry) =>
            ["configured", "larger-critical", "utility", "larger-orb"].includes(entry.id)
        )
    ).toBe(false);
    expect(
        canonicalSlot(
            stored.backpack.find((entry) => entry.kind === "ITEM" && entry.id !== "unfinished")
                .equipment
        )
    ).toEqual(canonicalSlot(scenario.oldEquipment));
    expect(stored.backpack.filter((entry) => entry.kind === "DRIF")).toEqual([
        expect.objectContaining({ templateId: String(scenario.critical.id), level: 6 }),
    ]);
    expect(stored.backpack.find((entry) => entry.kind === "ORB")).toMatchObject({
        templateId: String(scenario.oldOrb.id),
        level: 1,
    });
    await page.getByRole("button", { name: "Zapisz lokalnie", exact: true }).click();
    await page.getByRole("link", { name: /Buildy lokalne/ }).click();
    const download = page.waitForEvent("download");
    await page.locator(".saved-build-card").getByRole("button", { name: "Eksportuj JSON" }).click();
    const exported = JSON.parse(await readFile(await (await download).path(), "utf8"));
    expect(exported.version).toBe(3);
    expect(exported.build.backpack).toEqual(stored.backpack);
    const restored = page.waitForResponse(isCalculation);
    await page
        .locator(".saved-build-card")
        .getByRole("button", { name: "Wczytaj", exact: true })
        .click();
    expect((await restored).status()).toBe(200);
    await expect
        .poll(async () => canonicalSlot((await draft(page)).requestData.slots.helmet))
        .toEqual(canonicalSlot(expected));
    expect((await draft(page)).backpack).toEqual(stored.backpack);
});

test("unfinished backpack equipment is blocked in the UI and rejected by the real API", async ({
    page,
    request,
}) => {
    await importScenario(page, scenario);
    await page
        .getByRole("group", { name: "Źródło wyposażenia" })
        .getByRole("button", { name: "Plecak", exact: true })
        .click();
    const source = page.getByRole("region", { name: "Plecak do wyposażenia" });
    await source
        .locator(".backpack-card")
        .filter({ has: page.getByLabel("1 z 9 gwiazdek") })
        .getByRole("button")
        .click();
    await expect(source.getByRole("status")).toContainText("pojemność");
    await expect(source.getByRole("button", { name: "Załóż w slocie Hełm" })).toBeDisabled();
    const before = await draft(page);
    const rejected = await request.post(calculationPath, {
        data: { slots: { helmet: scenario.overloaded }, characterStats: {} },
    });
    expect(rejected.status()).toBe(400);
    const error = await rejected.json();
    expect(error.message).toMatch(/pojemno/i);
    expect(error.code).toBeTruthy();
    expect(error.requestId).toBe(rejected.headers()["x-request-id"]);
    expect(error.requestId).toBeTruthy();
    expect((await draft(page)).requestData).toEqual(before.requestData);
    expect((await draft(page)).backpack).toEqual(before.backpack);
    await calculateAndCompare(page, request, scenario, scenario.oldEquipment);
});

test("displays real calculator validation errors and recovers after fixing the equipment", async ({
    page,
    request,
}) => {
    await importScenario(page, scenario);
    const editor = page.getByLabel("Edytor wybranego slotu");
    const overloaded = scenario.overloaded.drifIds.map((id) =>
        scenario.catalog.drifs.find((stone) => String(stone.id) === id)
    );
    for (const [index, stone] of overloaded.entries()) {
        await editor
            .getByLabel(`Wybierz rodzaj drifa ${index + 1}`, { exact: true })
            .selectOption(stone.name);
        await editor
            .getByLabel(`Wybierz wielkość drifa ${index + 1}`, { exact: true })
            .selectOption(String(stone.id));
        await editor
            .getByLabel(`Wybierz poziom drifa ${index + 1}`, { exact: true })
            .selectOption("21");
    }
    const responsePromise = page.waitForResponse(isCalculation);
    await page.getByRole("button", { name: "Przelicz statystyki", exact: true }).click();
    const response = await responsePromise;
    expect(response.status()).toBe(400);
    const error = await response.json();
    await expect(page.getByRole("alert")).toContainText(error.message);
    await expect(
        page.getByRole("button", { name: "Przelicz statystyki", exact: true })
    ).toBeEnabled();
    expect(error.requestId).toBe(response.headers()["x-request-id"]);
    for (let index = 0; index < overloaded.length; index += 1)
        await editor
            .getByLabel(`Wybierz rodzaj drifa ${index + 1}`, { exact: true })
            .selectOption("");
    const expected = { ...scenario.oldEquipment, drifIds: [], drifLevels: {} };
    await calculateAndCompare(page, request, scenario, expected);
    await expect(page.getByRole("alert")).toHaveCount(0);
});

test.describe("mobile backpack against real API", () => {
    test.use(mobileDevice);
    test("selects complete items and leveled stones and renders the backend result at 320px", async ({
        page,
        request,
    }) => {
        await page.setViewportSize({ width: 320, height: 844 });
        await importScenario(page, scenario, true);
        await page.getByRole("button", { name: "Edytuj slot: Hełm", exact: true }).click();
        await page.getByRole("button", { name: "Zmień przedmiot", exact: true }).click();
        const dialog = page.getByRole("dialog");
        await dialog.getByRole("button", { name: "Plecak", exact: true }).click();
        await dialog.getByRole("button", { name: /Przedmiot 1 z plecaka/ }).click();
        await expect(page.getByLabel("Gwiazdki", { exact: true })).toHaveValue("8");
        await page.getByLabel("Drif 1 z plecaka").selectOption("larger-critical");
        await page.getByLabel("Drif 2 z plecaka").selectOption("utility");
        await page.getByLabel("Orb 1 z plecaka").selectOption("larger-orb");
        const expected = {
            ...scenario.configured,
            drifIds: [String(scenario.largerCritical.id), String(scenario.utility.id)],
            drifLevels: { 0: 11, 1: 6 },
            orbIds: [String(scenario.largerOrb.id)],
            orbLevels: [3],
        };
        await calculateAndCompare(page, request, scenario, expected, true);
        const stored = await draft(page);
        await page.reload();
        expect((await draft(page)).backpack).toEqual(stored.backpack);
        await calculateAndCompare(page, request, scenario, expected, true);
        expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
        ).toBe(true);
    });
});
