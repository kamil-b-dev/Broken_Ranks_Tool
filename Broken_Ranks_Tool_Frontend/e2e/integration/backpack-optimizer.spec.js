import { expect, test } from "@playwright/test";
import { Buffer } from "node:buffer";

const optimizerPath = "/api/optimizer/drifs";
const draft = (page) =>
    page.evaluate(
        () => JSON.parse(localStorage.getItem("broken-ranks-tool.equipment-draft.v3")).value
    );
const scenario = async (request) => {
    const http = await request.get("/api/initial-data");
    expect(http.status(), "Start the read-only backend on port 8082").toBe(200);
    const catalog = await http.json();
    const item = catalog.items
        .filter(
            (candidate) =>
                candidate.category === "HELMET" &&
                candidate.rarity === "RARE" &&
                ["X", "XI", "XII"].includes(candidate.tier) &&
                candidate.capacity >= 20
        )
        .sort((a, b) => b.capacity - a.capacity)[0];
    const drif = catalog.drifs.find(
        (candidate) => candidate.bonusType === "CRITICAL_CHANCE" && candidate.size === "SUBDRIF"
    );
    const orb = catalog.orbs.find((candidate) => candidate.size === "SUBORB");
    expect(item).toBeTruthy();
    expect(drif).toBeTruthy();
    expect(orb).toBeTruthy();
    const helmet = {
        itemId: item.id,
        itemStars: 7,
        drifIds: [drif.id],
        drifLevels: { 0: 2 },
        orbIds: [],
        orbLevels: [],
    };
    const owned = (id) => ({ id, templateId: drif.id, level: 3 });
    const base = {
        mode: "BUILD_FROM_SCRATCH",
        configurationMode: "ADVANCED",
        originalSlots: { helmet },
        priorities: { CRITICAL_CHANCE: 10 },
        targetQuantities: { CRITICAL_CHANCE: { min: 1, max: 1 } },
        drifSizeQuantities: {
            CRITICAL_CHANCE: {
                SUBDRIF: { min: 1, max: 1 },
                BIDRIF: { min: 0, max: 0 },
                MAGNIDRIF: { min: 0, max: 0 },
                ARCYDRIF: { min: 0, max: 0 },
            },
        },
        backpackOnly: true,
        backpackDrifs: [owned("selected")],
    };
    return { catalog, helmet, drif, orb, owned, base };
};
const assertParity = async (request, response) => {
    const calculation = await request.post("/api/calculator/calculate", {
        data: response.optimizedSetup,
    });
    expect(calculation.status()).toBe(200);
    expect(await calculation.json()).toEqual(response.calculationResult);
};

test("real optimizer rejects malformed backpack requests before optimization", async ({
    request,
}) => {
    const { base, owned } = await scenario(request);
    const invalid = [
        {
            name: "201 entries",
            changes: {
                backpackDrifs: Array.from({ length: 201 }, (_, index) => owned(`owned-${index}`)),
            },
            message: /200/,
        },
        {
            name: "duplicate occurrence",
            changes: { backpackDrifs: [owned("same"), owned("same")] },
        },
        { name: "null occurrence", changes: { backpackDrifs: [null] } },
        { name: "missing list", changes: { backpackDrifs: null } },
        {
            name: "invalid level",
            changes: { backpackDrifs: [{ ...owned("bad-level"), level: 22 }] },
        },
        { name: "stock without option", changes: { backpackOnly: false } },
        { name: "simple mode", changes: { configurationMode: "SIMPLE" } },
        { name: "advisor mode", changes: { mode: "ADVISOR" } },
        { name: "variants", changes: { generateVariants: true } },
    ];
    for (const { name, changes, message } of invalid) {
        await test.step(name, async () => {
            const http = await request.post(optimizerPath, { data: { ...base, ...changes } });
            expect(http.status()).toBe(400);
            const response = await http.json();
            expect(response.code).toBe("INVALID_REQUEST");
            if (message) expect(response.message).toMatch(message);
            expect(response.optimizedSetup).toBeUndefined();
            expect(response.backpackDrifUsages).toBeUndefined();
        });
    }
});

test("real optimizer accepts 200 occurrences, preserves the normal target and uses one owned level", async ({
    request,
}) => {
    const { base, owned, drif } = await scenario(request);
    const normal = await request.post(optimizerPath, {
        data: { ...base, backpackOnly: false, backpackDrifs: [] },
    });
    expect(normal.status()).toBe(200);
    const target = await normal.json();
    expect(target.summary.outcome).toMatch(/^VALID_BUILD/);
    const entries = Array.from({ length: 200 }, (_, index) => owned(`owned-${index}`));
    const http = await request.post(optimizerPath, { data: { ...base, backpackDrifs: entries } });
    expect(http.status()).toBe(200);
    const response = await http.json();
    expect(response.summary.outcome).toMatch(/^VALID_BUILD/);
    expect(response.targetSetup).toEqual(target.optimizedSetup);
    expect(response.backpackDrifUsages).toHaveLength(1);
    const usage = response.backpackDrifUsages[0];
    expect(entries.some((entry) => entry.id === usage.entryId)).toBe(true);
    expect(usage.slotKey).toBe("helmet");
    expect(response.optimizedSetup.slots.helmet.drifIds[usage.drifIndex]).toBe(drif.id);
    expect(response.optimizedSetup.slots.helmet.drifLevels[usage.drifIndex]).toBe(3);
    expect(response.targetSetup.slots.helmet.drifLevels[usage.drifIndex]).toBeGreaterThan(3);
    await assertParity(request, response);
});

for (const layout of ["desktop", "mobile"]) {
    test(`${layout} applies real backpack optimization to a full bag and persists the exact consumed occurrence`, async ({
        page,
        request,
    }) => {
        const { catalog, helmet, drif, orb } = await scenario(request);
        const backpack = [
            { id: "selected", kind: "DRIF", templateId: drif.id, level: 3 },
            { id: "unselected", kind: "DRIF", templateId: drif.id, level: 1 },
            ...Array.from({ length: 198 }, (_, index) => ({
                id: `orb-${index}`,
                kind: "ORB",
                templateId: orb.id,
                level: 1,
            })),
        ];
        await page.setViewportSize(
            layout === "mobile" ? { width: 320, height: 740 } : { width: 1800, height: 1100 }
        );
        await page.goto(`/builder?ui=${layout}`);
        await expect(
            page
                .getByRole("group", { name: "Widok ekwipunku" })
                .or(page.getByRole("navigation", { name: "Sekcje kreatora" }))
                .getByRole("button", { name: "Plecak", exact: true })
        ).toBeVisible();
        await expect(page.locator('input[type="file"]')).toHaveCount(1);
        await page.locator('input[type="file"]').setInputFiles({
            name: "real-backpack.json",
            mimeType: "application/json",
            buffer: Buffer.from(
                JSON.stringify({
                    format: "broken-ranks-tool-build",
                    version: 3,
                    build: {
                        requestData: { slots: { helmet }, characterStats: {} },
                        backpack,
                        characterConfig: null,
                        lockedSlots: [],
                        lockedDrifs: {},
                    },
                })
            ),
        });
        await expect(page.getByText(/Wczytano build z pliku/)).toBeVisible();
        await page
            .getByRole("group", { name: "Widok ekwipunku" })
            .or(page.getByRole("navigation", { name: "Sekcje kreatora" }))
            .getByRole("button", { name: "Plecak", exact: true })
            .click();
        await page
            .getByRole("checkbox", {
                name: `Drif do optymalizacji: ${drif.name}, SUBDRIF, poziom 3`,
                exact: true,
            })
            .check();
        await expect
            .poll(
                async () =>
                    (await draft(page)).backpack.find((entry) => entry.id === "selected")
                        .sendToBackend
            )
            .toBe(true);
        await page.goto(`/optimizer?ui=${layout}`);
        const label = catalog.gameRules.bonusTranslations.CRITICAL_CHANCE;
        if (layout === "mobile") {
            await page.getByLabel("Tryb optymalizatora").selectOption("ADVANCED");
            await page.getByText("Opcje i warianty", { exact: true }).click();
        } else await page.getByRole("button", { name: "Zaawansowany", exact: true }).click();
        await page.getByRole("checkbox", { name: "Użyj drifów z plecaka", exact: true }).check();
        if (layout === "mobile") {
            await page.getByRole("button", { name: "＋ Dodaj cel", exact: true }).click();
            await page.getByRole("button", { name: label, exact: true }).click();
        } else await page.locator(".optimizer-bonus-card").filter({ hasText: label }).click();
        await page.getByLabel(`Maksymalna liczba drifów dla ${label}`, { exact: true }).fill("1");
        await page.getByLabel(`Minimalna liczba drifów dla ${label}`, { exact: true }).fill("1");
        await page.getByText("Rozmiary drifów", { exact: true }).click();
        for (const size of ["SUBDRIF", "BIDRIF", "MAGNIDRIF", "ARCYDRIF"]) {
            await page
                .getByRole("checkbox", { name: `Ogranicz ${size} dla ${label}`, exact: true })
                .check();
            await page
                .getByLabel(`Maksimum ${size} dla ${label}`, { exact: true })
                .fill(size === "SUBDRIF" ? "1" : "0");
            if (size === "SUBDRIF")
                await page.getByLabel(`Minimum ${size} dla ${label}`, { exact: true }).fill("1");
        }
        const pending = page.waitForResponse(
            (response) =>
                response.url().endsWith(optimizerPath) && response.request().method() === "POST"
        );
        await page.getByRole("button", { name: /Uruchom optymalizację/i }).click();
        const http = await pending;
        expect(http.status()).toBe(200);
        expect(http.request().postDataJSON().backpackDrifs).toEqual([
            { id: "selected", templateId: drif.id, level: 3 },
        ]);
        const response = await http.json();
        expect(response.summary.outcome).toMatch(/^VALID_BUILD/);
        expect(response.backpackDrifUsages).toEqual([
            { entryId: "selected", slotKey: "helmet", drifIndex: 0 },
        ]);
        await assertParity(request, response);
        await expect
            .poll(async () => (await draft(page)).requestData.slots.helmet.drifLevels[0])
            .toBe(3);
        const applied = await draft(page);
        expect(applied.backpack).toHaveLength(200);
        expect(applied.backpack.some((entry) => entry.id === "selected")).toBe(false);
        expect(applied.backpack.find((entry) => entry.id === "unselected")).toEqual({
            id: "unselected",
            kind: "DRIF",
            templateId: String(drif.id),
            level: 1,
        });
        expect(
            applied.backpack.filter((entry) => entry.kind === "ORB").map((entry) => entry.id)
        ).toEqual(backpack.filter((entry) => entry.kind === "ORB").map((entry) => entry.id));
        expect(
            applied.backpack.find((entry) => entry.kind === "DRIF" && entry.level === 2)
        ).toEqual(expect.objectContaining({ templateId: String(drif.id) }));
        if (layout === "mobile")
            await page.getByRole("button", { name: "Pokaż wynik →", exact: true }).click();
        await page.getByText("Drify z plecaka — poziomy docelowe", { exact: true }).click();
        await expect(page.locator(".optimizer-backpack-targets tbody tr")).toContainText(
            String(response.targetSetup.slots.helmet.drifLevels[0])
        );
        await page.goto(`/builder?ui=${layout}`);
        await page
            .getByRole("group", { name: "Widok ekwipunku" })
            .or(page.getByRole("navigation", { name: "Sekcje kreatora" }))
            .getByRole("button", { name: "Plecak", exact: true })
            .click();
        await expect(page.locator(".backpack-card")).toHaveCount(200);
        expect(await draft(page)).toEqual(applied);
    });
}
