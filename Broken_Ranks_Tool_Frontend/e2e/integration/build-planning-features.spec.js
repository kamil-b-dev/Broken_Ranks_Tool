import { expect, test } from "@playwright/test";
import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";

let catalog;
test.beforeAll(async ({ request }) => {
    const response = await request.get("/api/initial-data");
    expect(response.status()).toBe(200);
    catalog = await response.json();
});
const item = (name) => catalog.items.find((entry) => entry.name === name);
const payload = (name = "Htagan", level = 100) => ({
    format: "broken-ranks-tool-build",
    version: 4,
    build: {
        requestData: {
            slots: {
                helmet: {
                    itemId: item(name).id,
                    itemStars: 1,
                    orbIds: [],
                    orbLevels: [],
                    drifIds: [],
                    drifLevels: {},
                },
                ring1: {
                    itemId: null,
                    itemStars: 1,
                    orbIds: [],
                    orbLevels: [],
                    drifIds: [],
                    drifLevels: {},
                    synergetic: { name: "Res testowy", stats: { PŻ: 123, "Odporność ogień": 45 } },
                },
            },
            characterStats: {},
        },
        characterConfig: { level, spentPoints: {} },
        lockedSlots: [],
        lockedDrifs: {},
        backpack: [],
    },
});
const importPayload = async (page, document) => {
    for (
        let i = 0;
        i < 3 &&
        (await page.getByRole("button", { name: "Zamknij komunikat", exact: true }).count());
        i++
    )
        await page.getByRole("button", { name: "Zamknij komunikat", exact: true }).first().click();
    await page
        .locator('input[type="file"]')
        .first()
        .setInputFiles({
            name: "build.json",
            mimeType: "application/json",
            buffer: Buffer.from(JSON.stringify(document)),
        });
    await expect(page.getByText(/Wczytano build z pliku/)).toBeVisible();
    await expect
        .poll(() => draft(page).then((value) => value?.requestData.slots.helmet?.itemStars))
        .toBe(document.build.requestData.slots.helmet.itemStars);
};
const draft = (page) =>
    page.evaluate(
        () => JSON.parse(localStorage.getItem("broken-ranks-tool.equipment-draft.v4"))?.value
    );
const saved = (page) =>
    page.evaluate(
        () => JSON.parse(localStorage.getItem("broken-ranks-tool.build-library.v1"))?.builds || []
    );
const openTools = async (page) => {
    const tools = page.locator(".saved-build-card").first().locator(".build-record-tools");
    if ((await tools.getAttribute("open")) == null) await tools.locator("summary").click();
    return tools;
};

test("previews changes, preserves saved versions and metadata, recalculates, exports PNG and shares read-only", async ({
    page,
}, testInfo) => {
    await page.goto("/builder?ui=desktop");
    await expect(page.getByRole("heading", { name: "Ekwipunek", exact: true })).toBeVisible();
    const original = payload("Htagan", 90);
    await importPayload(page, original);
    await expect(page.locator(".equipment-requirements")).toContainText("wymagany poziom 100");
    const before = await draft(page);
    const preview = page.locator(".item-preview");
    await preview.locator("summary").click();
    await preview
        .getByRole("combobox", { name: "Przedmiot do porównania", exact: true })
        .selectOption(String(item("Miłość Morany").id));
    await preview.getByRole("button", { name: "Sprawdź zmianę", exact: true }).click();
    await expect(preview.locator("dl")).toBeVisible();
    expect(await draft(page)).toEqual(before);
    await page.getByRole("button", { name: "Zapisz lokalnie", exact: true }).click();
    await page.getByRole("link", { name: /Buildy lokalne/ }).click();
    let tools = await openTools(page);
    await tools.getByRole("textbox", { name: "Notatka", exact: true }).fill("Plan pod exp");
    await tools
        .getByRole("textbox", { name: "Oznaczenia (oddziel przecinkiem)", exact: true })
        .fill("exp, test");
    await tools.getByRole("button", { name: "Zapisz opis" }).click();
    await expect.poll(() => saved(page).then((entries) => entries[0].notes)).toBe("Plan pod exp");
    const changed = structuredClone(original);
    changed.build.requestData.slots.helmet.itemStars = 7;
    await importPayload(page, changed);
    const card = page.locator(".saved-build-card").first();
    await card.getByRole("button", { name: "Nadpisz", exact: true }).click();
    await card.getByRole("button", { name: "Potwierdź nadpisanie", exact: true }).click();
    await expect.poll(() => saved(page).then((entries) => entries[0].revisions?.length)).toBe(1);
    tools = await openTools(page);
    await tools.getByRole("button", { name: "Przywróć wersję" }).click();
    await expect
        .poll(() =>
            saved(page).then(
                (entries) => entries[0].payload.build.requestData.slots.helmet.itemStars
            )
        )
        .toBe(1);
    expect((await draft(page)).requestData.slots.helmet.itemStars).toBe(7);
    await page.reload();
    tools = await openTools(page);
    await expect(tools.getByRole("textbox", { name: "Notatka", exact: true })).toHaveValue(
        "Plan pod exp"
    );
    const calculated = page.waitForResponse((response) =>
        response.url().endsWith("/api/calculator/calculate")
    );
    await tools.getByRole("button", { name: "Przelicz statystyki", exact: true }).click();
    const statistics = (await (await calculated).json()).stats;
    await expect.poll(() => saved(page).then((entries) => entries[0].stats)).toEqual(statistics);
    await tools.getByRole("button", { name: "Sprawdź braki do tego buildu" }).click();
    await expect(tools.locator(".build-resource-list")).toContainText("Do zdobycia");
    const download = page.waitForEvent("download");
    await tools.getByRole("button", { name: "Pobierz PNG" }).click();
    const image = await download;
    await image.saveAs(testInfo.outputPath("build-card.png"));
    expect((await readFile(await image.path())).subarray(0, 8)).toEqual(
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
    );
    await tools.getByRole("button", { name: "Udostępnij link" }).click();
    await expect(
        tools.getByRole("textbox", { name: "Link do podglądu", exact: true })
    ).toBeVisible();
    const link = await tools
        .getByRole("textbox", { name: "Link do podglądu", exact: true })
        .inputValue();
    await page.screenshot({ path: testInfo.outputPath("library-tools.png"), fullPage: true });
    await page.goto(link);
    await expect(page.getByText("Udostępniony build — podgląd", { exact: true })).toBeVisible();
    await expect(
        page.getByRole("heading", { name: "Zapisane statystyki", exact: true })
    ).toBeVisible();
    expect((await draft(page)).requestData.slots.helmet.itemStars).toBe(7);
    await page.getByRole("button", { name: "Skopiuj do kreatora", exact: true }).click();
    await expect
        .poll(() => draft(page).then((value) => value.requestData.slots.helmet.itemStars))
        .toBe(1);
    expect((await draft(page)).requestData.slots.ring1.synergetic.stats.PŻ).toBe(123);
});

test("plans from current equipment and keeps a manually required intermediate item", async ({
    page,
}, testInfo) => {
    await page.goto("/builder?ui=desktop");
    await expect(page.getByRole("heading", { name: "Ekwipunek", exact: true })).toBeVisible();
    await importPayload(page, payload("Miłość Morany", 140));
    await page.getByRole("button", { name: "Zapisz lokalnie", exact: true }).click();
    await expect.poll(() => saved(page).then((entries) => entries.length)).toBe(1);
    await importPayload(page, payload("Htagan", 100));
    await page.getByRole("link", { name: "Ścieżka rozwoju", exact: true }).click();
    const goal = (await saved(page))[0];
    await page
        .getByRole("combobox", { name: "Docelowy build", exact: true })
        .selectOption(`build:${goal.id}`);
    await page.getByRole("combobox", { name: "Profesja", exact: true }).selectOption("FIRE_MAGE");
    await page
        .getByRole("combobox", { name: "Początek ścieżki", exact: true })
        .selectOption("current");
    await page.getByText("Obowiązkowe przedmioty pośrednie", { exact: true }).click();
    await page.getByRole("spinbutton", { name: "Poziom etapu", exact: true }).fill("110");
    await page
        .getByRole("combobox", { name: "Przedmiot etapu", exact: true })
        .selectOption(String(item("Sigil").id));
    await page.getByRole("button", { name: "Dodaj etap obowiązkowy" }).click();
    const response = page.waitForResponse((response) =>
        response.url().endsWith("/api/progression-path/plan")
    );
    await page.getByRole("button", { name: "Zaplanuj ścieżkę", exact: true }).click();
    const planned = await response;
    expect(planned.status()).toBe(200);
    const result = await planned.json();
    expect(result.stages[0].stage.characterLevel).toBe(100);
    expect(
        result.stages.some(
            (entry) =>
                entry.stage.characterLevel === 110 &&
                entry.stage.equipment.slots.helmet.itemId === item("Sigil").id
        )
    ).toBe(true);
    expect(result.stages.at(-1).stage.equipment.slots.helmet.itemId).toBe(item("Miłość Morany").id);
    expect((await draft(page)).requestData.slots.helmet.itemId).toBe(item("Htagan").id);
    await page.screenshot({ path: testInfo.outputPath("owned-progression.png"), fullPage: true });
});

test("preserves advisor exclusions and reopens a complete saved analysis without another search", async ({
    page,
}, testInfo) => {
    await page.goto("/builder?ui=desktop");
    await expect(page.getByRole("heading", { name: "Ekwipunek", exact: true })).toBeVisible();
    const document = payload();
    const drif = catalog.drifs.find(
        (entry) => entry.size === "BIDRIF" && entry.bonusType === "CRITICAL_CHANCE"
    );
    document.build.requestData.slots.helmet.drifIds = [drif.id];
    document.build.requestData.slots.helmet.drifLevels = { 0: 6 };
    await importPayload(page, document);
    await page.getByRole("link", { name: /Optymalizator/ }).click();
    await page.getByRole("button", { name: "Doradca", exact: true }).click();
    await page.getByLabel("Główny cel", { exact: true }).selectOption("CRITICAL_CHANCE");
    await page.getByRole("checkbox", { name: "Gwiazdki", exact: true }).uncheck();
    await page.getByRole("checkbox", { name: "Ulepszanie drifów", exact: true }).check();
    await page.getByRole("checkbox", { name: "Zakupy drifów", exact: true }).check();
    await page.getByLabel("Maksymalna liczba działań w planie").selectOption("1");
    await page.getByText("Wykluczenia Doradcy", { exact: true }).click();
    await page
        .getByRole("combobox", { name: "Nie proponuj przedmiotu", exact: true })
        .selectOption(String(item("Miłość Morany").id));
    await page
        .getByRole("combobox", { name: "Nie kupuj typu drifa", exact: true })
        .selectOption("CRITICAL_CHANCE");
    const response = page.waitForResponse((response) =>
        response.url().endsWith("/api/optimizer/drifs")
    );
    await page.getByRole("button", { name: /^Analizuj build$/i }).click();
    const analyzed = await response;
    expect(analyzed.status()).toBe(200);
    expect(analyzed.request().postDataJSON().advisor.excludedPurchaseBonusTypes).toEqual([
        "CRITICAL_CHANCE",
    ]);
    const result = await analyzed.json();
    expect(result.summary.success).toBe(true);
    expect(result.optimizedSetup.slots.ring1.synergetic.stats.PŻ).toBe(123);
    await page.getByText("Archiwum analiz", { exact: true }).click();
    await page.getByRole("button", { name: "Zapisz pełną analizę", exact: true }).click();
    await expect
        .poll(() =>
            page.evaluate(
                () =>
                    JSON.parse(localStorage.getItem("broken-ranks-tool.analysis-archive.v1"))
                        ?.entries.length
            )
        )
        .toBe(1);
    await page.reload();
    let searches = 0;
    page.on("request", (request) => {
        if (request.url().endsWith("/api/optimizer/drifs")) searches++;
    });
    const archive = page.locator(".analysis-archive");
    await archive.locator("summary").click();
    await archive.locator("li > button").first().click();
    await expect(archive.getByRole("heading", { name: "Zapisany wynik analizy" })).toBeVisible();
    await expect(archive.getByRole("button", { name: "Zastosuj wybrany wariant" })).toHaveCount(0);
    expect(searches).toBe(0);
    await page.screenshot({ path: testInfo.outputPath("saved-analysis.png"), fullPage: true });
});
