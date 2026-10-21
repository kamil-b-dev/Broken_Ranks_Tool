import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { builderCatalog } from "../src/test/fixtures/equipment/builderCatalog.js";
import { mobileDevice } from "./mobile-device";

const catalog = {
    ...builderCatalog,
    drifs: [...builderCatalog.drifs, { ...builderCatalog.drifs[0], id: 61, size: "ARCYDRIF" }],
};
const original = {
    requestData: {
        slots: {
            helmet: {
                itemId: 1,
                itemStars: 1,
                drifIds: [60],
                drifLevels: { 0: 6 },
                orbIds: [],
                orbLevels: [],
            },
        },
        characterStats: {},
    },
    characterConfig: null,
    lockedSlots: [],
    lockedDrifs: {},
};

test.beforeEach(async ({ page }) => {
    await page.addInitScript(
        (draft) =>
            localStorage.setItem(
                "broken-ranks-tool.equipment-draft.v1",
                JSON.stringify({ version: 1, value: draft })
            ),
        original
    );
    await page.route("**/api/initial-data", (route) => route.fulfill({ json: catalog }));
    await page.route("**/api/calculator/calculate", (route) =>
        route.fulfill({ json: { stats: { CRITICAL_CHANCE: "12%" } } })
    );
});
const draft = (page) =>
    page.evaluate(
        () =>
            JSON.parse(
                localStorage.getItem("broken-ranks-tool.equipment-draft.v3") ||
                    localStorage.getItem("broken-ranks-tool.equipment-draft.v2")
            ).value
    );
const openDesktop = async (page) => {
    await page.setViewportSize({ width: 1800, height: 1100 });
    await page.goto("/builder?ui=desktop");
    await page
        .getByRole("group", { name: "Widok ekwipunku" })
        .or(page.getByRole("navigation", { name: "Sekcje kreatora" }))
        .getByRole("button", { name: "Plecak", exact: true })
        .click();
};
const addItem = async (page) => {
    await page.getByRole("button", { name: "+ Dodaj przedmiot" }).click();
    await page.getByLabel("Przedmiot do plecaka").selectOption("1");
};

test("assembles a replacement with gems, keeps over-capacity drafts and restores its order in JSON", async ({
    page,
}) => {
    const requests = [];
    page.on("request", (request) => {
        if (request.url().endsWith("/api/calculator/calculate"))
            requests.push(request.postDataJSON());
    });
    await openDesktop(page);
    await addItem(page);
    const editor = page.getByLabel("Edytor plecaka");
    await editor.getByLabel("Wybierz rodzaj orba", { exact: true }).selectOption("Ochrona");
    await editor.getByLabel("Wybierz wielkość orba").selectOption("50");
    await editor.getByLabel("Wybierz rodzaj drifa 1").selectOption("Band");
    await editor.getByLabel("Wybierz wielkość drifa 1").selectOption("61");
    await editor.getByLabel("Wybierz poziom drifa 1").selectOption("21");
    await expect(editor.getByRole("status")).toContainText("pojemność");
    await expect
        .poll(async () => (await draft(page)).backpack?.[0]?.equipment?.drifLevels?.[0])
        .toBe(21);
    await page.getByRole("button", { name: "+ Dodaj orb" }).click();
    await editor.getByLabel("Rodzaj orba").selectOption("Ochrona");
    await editor.getByLabel("Rozmiar").selectOption("50");
    await page.getByRole("button", { name: "+ Dodaj drif" }).click();
    await editor.getByLabel("Rodzaj drifa").selectOption("Band");
    await editor.getByLabel("Rozmiar").selectOption("60");
    await editor.getByLabel("Poziom", { exact: true }).selectOption("6");
    await page.getByRole("button", { name: "Przesuń wcześniej: Band" }).click();
    await expect
        .poll(async () => (await draft(page)).backpack.map((entry) => entry.kind))
        .toEqual(["ITEM", "DRIF", "ORB"]);
    const stored = await draft(page);
    expect(stored.requestData.slots.helmet.drifIds.filter(Boolean).map(Number)).toEqual([60]);
    expect(stored.requestData.slots.helmet.drifLevels[0]).toBe(6);
    expect(requests.every((request) => !Object.hasOwn(request, "backpack"))).toBe(true);
    await page.getByRole("button", { name: "Postać", exact: true }).click();
    await expect(page.getByLabel("Kołowy wybór slotów ekwipunku")).toBeVisible();
    await page
        .getByRole("group", { name: "Widok ekwipunku" })
        .or(page.getByRole("navigation", { name: "Sekcje kreatora" }))
        .getByRole("button", { name: "Plecak", exact: true })
        .click();
    await page
        .locator(".backpack-card")
        .first()
        .getByRole("button", { name: /Przedmiot/ })
        .click();
    await page.screenshot({ path: "../tmp/backpack-desktop-1800.png", fullPage: true });
    await page.getByRole("button", { name: "Zapisz lokalnie", exact: true }).click();
    await page.getByRole("link", { name: /Buildy lokalne/ }).click();
    const card = page.locator(".saved-build-card").last();
    const download = page.waitForEvent("download");
    await card.getByRole("button", { name: "Eksportuj JSON" }).click();
    const payload = JSON.parse(await readFile(await (await download).path(), "utf8"));
    expect(payload.version).toBe(3);
    expect(payload.build.backpack).toEqual(stored.backpack);
    await page.reload();
    await page
        .locator(".saved-build-card")
        .getByRole("button", { name: "Wczytaj", exact: true })
        .click();
    await expect.poll(async () => (await draft(page)).backpack).toEqual(stored.backpack);
});

test("catalog drops create separate inventory occurrences without equipping them", async ({
    page,
}) => {
    await openDesktop(page);
    await page.locator(".backpack-workbench").evaluate((element, item) => {
        const transfer = new DataTransfer();
        transfer.setData(
            "application/json",
            JSON.stringify({ ...item, dragType: "items", name: "Untrusted drag label" })
        );
        element.dispatchEvent(new DragEvent("drop", { bubbles: true, dataTransfer: transfer }));
    }, catalog.items[1]);
    await expect.poll(async () => (await draft(page)).backpack?.length).toBe(1);
    await expect(page.locator(".backpack-card")).toContainText(catalog.items[1].name);
    expect((await draft(page)).requestData.slots.armor?.itemId).toBeFalsy();
    await page.reload();
    await page
        .getByRole("group", { name: "Widok ekwipunku" })
        .or(page.getByRole("navigation", { name: "Sekcje kreatora" }))
        .getByRole("button", { name: "Plecak", exact: true })
        .click();
    await expect(page.locator(".backpack-card")).toContainText(catalog.items[1].name);
});

test("drags items and gems from database rows, filters and sorts without changing stored order", async ({
    page,
}) => {
    await openDesktop(page);
    const database = page.locator(".item-database-theme");
    const backpack = page.locator(".backpack-workbench");
    await database.getByRole("textbox", { name: "Wyszukaj przedmioty" }).fill("Hełm");
    await database
        .getByRole("button", { name: "Szczegóły: Hełm podróżnika X", exact: true })
        .locator("..")
        .dragTo(backpack.locator(".backpack-toolbar"));
    await expect(backpack.locator(".backpack-card")).toHaveCount(1);
    await database.getByRole("button", { name: "Orby", exact: true }).click();
    await database
        .getByRole("button", { name: "Szczegóły: Ochrona SUBORB", exact: true })
        .last()
        .dragTo(backpack.locator(".backpack-toolbar"));
    await expect(backpack.locator(".backpack-card")).toHaveCount(2);
    await database.getByRole("button", { name: "Drify", exact: true }).click();
    await database
        .getByRole("button", { name: "Szczegóły: Band ARCYDRIF", exact: true })
        .dragTo(backpack.locator(".backpack-toolbar"));
    await expect(backpack.locator(".backpack-card")).toHaveCount(3);
    await expect
        .poll(async () => (await draft(page)).backpack?.map((entry) => entry.kind))
        .toEqual(["ITEM", "ORB", "DRIF"]);
    const stored = await draft(page);
    for (const [label, name] of [
        ["Przedmioty", "Hełm podróżnika"],
        ["Drify", "Band"],
        ["Orby", "Ochrona"],
    ]) {
        await backpack.getByRole("button", { name: label, exact: true }).click();
        await expect(backpack.locator(".backpack-card")).toHaveCount(1);
        await expect(backpack.locator(".backpack-card")).toContainText(name);
    }
    await backpack.getByRole("button", { name: "Wszystko", exact: true }).click();
    await backpack.getByLabel("Sortuj według").selectOption("name");
    await expect(backpack.locator(".backpack-card").first()).toContainText("Band");
    await backpack.getByRole("button", { name: "Kierunek sortowania: rosnąco" }).click();
    await expect(backpack.locator(".backpack-card").first()).toContainText("Ochrona");
    await backpack.getByLabel("Sortuj według").selectOption("manual");
    await expect(backpack.locator(".backpack-card").first()).toContainText("Hełm podróżnika");
    expect((await draft(page)).backpack).toEqual(stored.backpack);
    expect((await draft(page)).requestData).toEqual(stored.requestData);
});

test.describe("mobile backpack", () => {
    test.use(mobileDevice);
    test("adds and edits at 320px without changing equipped gear", async ({ page }) => {
        await page.setViewportSize({ width: 320, height: 844 });
        await page.goto("/builder");
        await page
            .getByRole("group", { name: "Widok ekwipunku" })
            .or(page.getByRole("navigation", { name: "Sekcje kreatora" }))
            .getByRole("button", { name: "Plecak", exact: true })
            .click();
        await addItem(page);
        await expect(page.getByLabel("Edytor plecaka")).toBeVisible();
        const editor = page.getByLabel("Edytor plecaka");
        await editor.getByLabel("Wybierz rodzaj orba", { exact: true }).selectOption("Ochrona");
        await editor.getByLabel("Wybierz wielkość orba").selectOption("50");
        await editor.getByLabel("Wybierz rodzaj drifa 1").selectOption("Band");
        await editor.getByLabel("Wybierz wielkość drifa 1").selectOption("60");
        await editor.getByLabel("Wybierz poziom drifa 1").selectOption("6");
        const card = page.locator(".backpack-card");
        await expect(card.getByLabel("Umieszczone drify")).toContainText("Band");
        await expect(card.getByLabel("Umieszczone orby")).toContainText("Ochrona");
        const icon = await card.locator(".equipment-slot-drif-category-icon").boundingBox();
        expect(icon.width).toBeGreaterThan(20);
        expect(icon.width).toBeLessThan(24);
        const editorIcon = await editor.locator(".orb-socket-glyph").boundingBox();
        expect(editorIcon.width).toBeGreaterThan(20);
        expect(editorIcon.width).toBeLessThan(28);
        await expect(page.locator("html")).toHaveJSProperty("scrollWidth", 320);
        for (const label of [
            "Wybierz rodzaj drifa 1",
            "Wybierz wielkość drifa 1",
            "Wybierz poziom drifa 1",
        ]) {
            const box = await editor.getByLabel(label).boundingBox();
            expect(box.width, `${label} must remain readable at 320px`).toBeGreaterThan(100);
            expect(box.x + box.width).toBeLessThanOrEqual(320);
        }
        await page
            .getByRole("group", { name: "Pokaż w plecaku" })
            .getByRole("button", { name: "Orby", exact: true })
            .click();
        await expect(page.getByText("Brak obiektów tego rodzaju w plecaku.")).toBeVisible();
        await page.getByRole("button", { name: "Wszystko", exact: true }).click();
        await page.getByLabel("Sortuj według").selectOption("tier");
        await expect(page.locator("html")).toHaveJSProperty("scrollWidth", 320);
        await page.screenshot({ path: "../tmp/backpack-mobile-320.png", fullPage: true });
    });
});
