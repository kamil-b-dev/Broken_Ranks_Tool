import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { Buffer } from "node:buffer";

const fixtureUrl = (name) => new URL(`../../src/test/fixtures/builds/${name}`, import.meta.url);

const canonicalSetup = ({ slots, characterStats = {} }) => ({
    characterStats,
    slots: Object.fromEntries(
        Object.entries(slots)
            .filter(([, slot]) => slot.itemId)
            .map(([key, slot]) => {
                const drifIds = [...(slot.drifIds || [])];
                const orbIds = [...(slot.orbIds || [])];
                while (drifIds.length && !drifIds.at(-1)) drifIds.pop();
                while (orbIds.length && !orbIds.at(-1)) orbIds.pop();
                return [
                    key,
                    {
                        itemId: Number(slot.itemId),
                        itemStars: Number(slot.itemStars),
                        drifIds: drifIds.map((id) => (id ? Number(id) : null)),
                        orbIds: orbIds.map((id) => (id ? Number(id) : null)),
                        drifLevels: Object.fromEntries(
                            drifIds.flatMap((id, index) =>
                                id ? [[index, Number(slot.drifLevels?.[index] ?? 1)]] : []
                            )
                        ),
                        orbLevels: orbIds.map((id, index) =>
                            id ? Number(slot.orbLevels?.[index] ?? 1) : null
                        ),
                    },
                ];
            })
    ),
});

async function importBuild(page, name, suppliedPayload) {
    const payload = suppliedPayload || JSON.parse(await readFile(fixtureUrl(name), "utf8"));
    await page.goto("/kreator");
    await expect(page.getByRole("button", { name: /Wczytaj build/ })).toBeEnabled();
    await page
        .locator('input[type="file"]')
        .first()
        .setInputFiles({
            name,
            mimeType: "application/json",
            buffer: Buffer.from(JSON.stringify(payload)),
        });
    await expect(page.getByText(/Wczytano build z pliku/)).toBeVisible();
    return payload;
}

async function exportCurrent(page) {
    await page.getByRole("button", { name: "Zapisz lokalnie" }).click();
    await page.getByRole("link", { name: /Buildy lokalne/ }).click();
    const card = page.locator(".saved-build-card").last();
    const download = page.waitForEvent("download");
    await card.getByRole("button", { name: "Eksportuj JSON" }).click();
    return JSON.parse(await readFile(await (await download).path(), "utf8"));
}

async function assertCalculatorParity(request, response) {
    expect(response.calculationResult).toBeTruthy();
    const fresh = await request.post("/api/calculator/calculate", {
        data: response.optimizedSetup,
    });
    expect(fresh.status()).toBe(200);
    expect(await fresh.json()).toEqual(response.calculationResult);
}

test.beforeEach(async ({ request }) => {
    const response = await request.get("/api/initial-data");
    expect(response.status(), "Start the real local backend on port 8082 before this suite").toBe(
        200
    );
    expect((await response.json()).items.length).toBeGreaterThan(100);
});

for (const name of ["legacy-epic-build.json", "archer-endgame-build.json"]) {
    test(`imports, saves, exports and restores ${name} through the real catalog`, async ({
        page,
        request,
    }) => {
        const original = await importBuild(page, name);
        const exported = await exportCurrent(page);
        expect(canonicalSetup(exported.build.requestData)).toEqual(
            canonicalSetup(original.build.requestData)
        );
        expect(exported.build.lockedSlots).toEqual(original.build.lockedSlots);
        expect(exported.build.lockedDrifs).toEqual(original.build.lockedDrifs);
        const calculation = await request.post("/api/calculator/calculate", {
            data: exported.build.requestData,
        });
        expect(calculation.status()).toBe(200);
        await page.reload();
        await page
            .locator(".saved-build-card")
            .getByRole("button", { name: "Wczytaj", exact: true })
            .click();
        const restored = await exportCurrent(page);
        expect(canonicalSetup(restored.build.requestData)).toEqual(
            canonicalSetup(exported.build.requestData)
        );
        expect(restored.build.characterConfig).toEqual(exported.build.characterConfig);
    });
}

test("runs the reported Archer 12/12 configuration through browser and backend", async ({
    page,
    request,
}) => {
    await importBuild(page, "archer-endgame-build.json");
    await page.getByRole("link", { name: /Optymalizator drifów/ }).click();
    await page.getByLabel("Profil prostego optymalizatora").selectOption("ARCHER");
    await page.getByLabel("Drify obrażeń", { exact: true }).fill("12");
    await page.getByLabel("Drify celności", { exact: true }).fill("12");
    await page.getByLabel("Redukcja obrażeń procentowych", { exact: true }).check();
    await page.getByLabel("Holm — szansa redukcji obrażeń", { exact: true }).check();
    const result = page.waitForResponse(
        (response) =>
            response.url().endsWith("/api/optimizer/drifs") &&
            response.request().method() === "POST"
    );
    const started = Date.now();
    await page.getByRole("button", { name: /URUCHOM OPTYMALIZACJĘ/i }).click();
    const http = await result;
    expect(http.status()).toBe(200);
    expect(Date.now() - started).toBeLessThan(30000);
    const response = await http.json();
    await assertCalculatorParity(request, response);
    await expect(page.getByRole("button", { name: /OPTYMALIZUJ PONOWNIE/i })).toBeEnabled();
    const exported = await exportCurrent(page);
    expect(canonicalSetup(exported.build.requestData)).toEqual(
        canonicalSetup(response.optimizedSetup)
    );
});

test("cancels a running advisor without requiring a plan before cancellation", async ({
    page,
    request,
}) => {
    await importBuild(page, "archer-endgame-build.json");
    await page.getByRole("link", { name: /Optymalizator drifów/ }).click();
    await page.getByRole("button", { name: /^Doradca/ }).click();
    await page.getByLabel("Główny cel").selectOption("HIT_CHANCE_MENTAL");
    await page.getByLabel("Strategia planu").selectOption("BEST_RESULT");
    await page.getByLabel("Maksymalna liczba działań w planie").selectOption("10");
    await page.getByLabel("Budżet czasu analizy").selectOption("6000");
    await page.getByLabel("Zakupy drifów", { exact: true }).check();
    await page.getByLabel("Zakupy przedmiotów", { exact: true }).check();
    await page.getByLabel("Ulepszanie drifów", { exact: true }).check();
    const requestStarted = page.waitForRequest(
        (req) => req.url().endsWith("/api/optimizer/drifs") && req.method() === "POST"
    );
    const result = page.waitForResponse(
        (res) => res.url().endsWith("/api/optimizer/drifs") && res.request().method() === "POST"
    );
    await page.getByRole("button", { name: /ANALIZUJ BUILD/i }).click();
    const run = (await requestStarted).postDataJSON();
    // Give the real search time to find candidates; no responses are mocked.
    await page.waitForTimeout(900);
    const busy = await request.post("/api/optimizer/drifs", { data: run });
    expect(busy.status()).toBe(429);
    const wrong = await request.post(`/api/optimizer/advisor/${run.advisor.runId}/cancel`, {
        headers: { "X-Advisor-Cancellation-Token": "00000000-0000-4000-8000-000000000000" },
        data: {},
    });
    expect((await wrong.json()).cancelled).toBe(false);
    const cancellation = page.waitForResponse((res) =>
        res.url().endsWith(`/advisor/${run.advisor.runId}/cancel`)
    );
    await page.getByRole("button", { name: /Zatrzymaj i pokaż znalezione plany/i }).click();
    expect((await (await cancellation).json()).cancelled).toBe(true);
    const http = await result;
    expect(http.status()).toBe(200);
    const response = await http.json();
    expect(response.advisorReport.status).toBe("CANCELLED");
    expect(response.advisorReport.verifiedCandidates).toBeGreaterThanOrEqual(0);
    expect(response.advisorReport.verifiedCandidates).toBeLessThanOrEqual(6);
    expect(response.advisorReport.proofComplete).toBe(false);
    await assertCalculatorParity(request, response);
    const exported = await exportCurrent(page);
    expect(canonicalSetup(exported.build.requestData)).toEqual(
        canonicalSetup(response.optimizedSetup)
    );
});

test("applies a verified advisor purchase plan explicitly", async ({ page, request }) => {
    const initial = await (await request.get("/api/initial-data")).json();
    const helmet = initial.items
        .filter((item) => item.category === "HELMET" && item.rarity === "RARE")
        .sort((left, right) => right.capacity - left.capacity)[0];
    expect(helmet.capacity).toBeGreaterThan(0);
    const payload = {
        format: "broken-ranks-tool-build",
        version: 1,
        build: {
            requestData: {
                slots: {
                    helmet: {
                        itemId: helmet.id,
                        itemStars: 5,
                        drifIds: [],
                        drifLevels: {},
                        orbIds: [],
                        orbLevels: [],
                    },
                },
                characterStats: {},
            },
            characterConfig: null,
            lockedSlots: [],
            lockedDrifs: {},
        },
    };
    await importBuild(page, "empty-helmet.json", payload);
    await page.getByRole("link", { name: /Optymalizator drifów/ }).click();
    await page.getByRole("button", { name: /^Doradca/ }).click();
    await page.getByLabel("Główny cel").selectOption("CRITICAL_CHANCE");
    await page.getByLabel("Maksymalna liczba działań w planie").selectOption("1");
    await page.getByLabel("Zakupy drifów", { exact: true }).check();
    const result = page.waitForResponse(
        (res) => res.url().endsWith("/api/optimizer/drifs") && res.request().method() === "POST"
    );
    await page.getByRole("button", { name: /ANALIZUJ BUILD/i }).click();
    const http = await result;
    expect(http.status()).toBe(200);
    const response = await http.json();
    expect(response.summary.success).toBe(true);
    expect(response.advisorReport.plans.length).toBeGreaterThan(0);
    expect(response.advisorReport.plans[0].actions.length).toBeGreaterThan(0);
    await assertCalculatorParity(request, response);
    await page.getByRole("button", { name: /Zastosuj wybrany wariant/ }).click();
    const exported = await exportCurrent(page);
    expect(canonicalSetup(exported.build.requestData)).toEqual(
        canonicalSetup(response.optimizedSetup)
    );
});
