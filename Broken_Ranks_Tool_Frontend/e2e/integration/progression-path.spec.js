import { expect, test } from "@playwright/test";
import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import { createContractValidator, loadApiContract } from "../../../scripts/api-contract.mjs";
const validate = createContractValidator(await loadApiContract());
const epicTarget = JSON.parse(
    await readFile(
        new URL("../../src/test/fixtures/builds/progression-epic-target.json", import.meta.url),
        "utf8"
    )
);

test("plans the current imported build with default options and a reserved ring", async ({
    page,
}, testInfo) => {
    await page.goto("/builder?ui=desktop");
    await expect(page.getByRole("heading", { name: "Ekwipunek", exact: true })).toBeVisible();
    await page
        .locator('input[type="file"]')
        .first()
        .setInputFiles({
            name: "BUILD (2).json",
            mimeType: "application/json",
            buffer: Buffer.from(JSON.stringify(epicTarget)),
        });
    await expect(page.getByRole("status")).toContainText("Wczytano build z pliku");
    await page.getByRole("link", { name: "Ścieżka rozwoju", exact: true }).click();
    await page
        .getByRole("combobox", { name: "Docelowy build", exact: true })
        .selectOption("current");
    await page.getByRole("checkbox", { name: /Pierścień 1/ }).check();
    const planned = page.waitForResponse(
        (http) =>
            http.url().endsWith("/api/progression-path/plan") && http.request().method() === "POST"
    );
    await page.getByRole("button", { name: "Zaplanuj ścieżkę", exact: true }).click();
    const response = await planned;
    expect(response.status()).toBe(200);
    const input = response.request().postDataJSON();
    expect(input.balanceStats).toBe(false);
    expect(input.minItemLevelGap).toBe(0);
    expect(input.resSlots).toEqual(["ring1"]);
    expect(input.targetEquipment.slots.ring1.itemId).toBeNull();
    const report = await response.json();
    validate("ProgressionPlanResponse", report);
    expect(report.outcome).toBe("VALID_PATH");
    expect(report.resSlots).toEqual(["ring1"]);
    expect(report.stages.every((entry) => entry.stage.equipment.slots.ring1?.itemId == null)).toBe(
        true
    );
    await expect(page.getByRole("heading", { name: "Plan rozwoju", exact: true })).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
    const stage = page.locator('.progression-timeline > li[data-level="32"]');
    await stage.locator(".progression-stage-toggle").click();
    const helmetTransfer = stage.locator(".progression-transfer-card").filter({
        has: page.getByRole("heading", { name: "Khalam", exact: true }),
    });
    await expect(helmetTransfer.getByText("Martumal", { exact: true })).toBeVisible();
    await expect(helmetTransfer.getByText("Drif · gniazdo 1", { exact: true })).toBeVisible();
    await expect(helmetTransfer.getByText("Hełm · gniazdo 1", { exact: true })).toBeVisible();
    await expect(stage.locator(".progression-instructions")).toHaveCount(0);
    await stage.getByText("Szczegóły", { exact: true }).click();
    await expect(stage.getByText("Przed", { exact: true }).first()).toBeVisible();
    await expect(stage.getByText("Po", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/^(Drif|Orb) \d+$/)).toHaveCount(0);
    await stage.screenshot({ path: testInfo.outputPath("named-stone-transfers-pl.png") });
    await page.getByRole("button", { name: "English", exact: true }).click();
    await expect(helmetTransfer.getByText("Remove from", { exact: true })).toBeVisible();
    await expect(helmetTransfer.getByText("Helmet · socket 1", { exact: true })).toBeVisible();
    await stage.screenshot({ path: testInfo.outputPath("named-stone-transfers-en.png") });
    await page.getByRole("button", { name: "Polski", exact: true }).click();
    const busyStage = page.locator('.progression-timeline > li[data-level="135"]');
    await busyStage.locator(".progression-stage-toggle").click();
    expect(await busyStage.locator(".progression-transfer-card li").count()).toBeGreaterThan(10);
    expect(await busyStage.locator(".progression-transfer-card").count()).toBeGreaterThan(2);
    await busyStage.locator(".progression-transfers").screenshot({
        path: testInfo.outputPath("busy-transfers.png"),
    });
});

for (const mobile of [false, true]) {
    test(`progression imports the complete epic target and restores legacy rules on ${mobile ? "mobile" : "desktop"}`, async ({
        page,
        request,
    }, testInfo) => {
        await page.setViewportSize(
            mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }
        );
        await page.addInitScript((payload) => {
            if (!localStorage.getItem("broken-ranks-tool-progression-path.v1"))
                localStorage.setItem(
                    "broken-ranks-tool-progression-path.v1",
                    JSON.stringify({
                        format: "broken-ranks-tool-progression-path",
                        version: 1,
                        project: {
                            characterClass: "FIRE_MAGE",
                            stages: [
                                {
                                    id: "target",
                                    name: "Cel epicki",
                                    characterLevel: 140,
                                    durationWeight: 1,
                                    payload,
                                },
                            ],
                            allowAcquisition: true,
                        },
                    })
                );
        }, epicTarget);
        await page.goto(`/progression-path?ui=${mobile ? "mobile" : "desktop"}`);
        await expect(page.getByLabel("Docelowy build")).toHaveValue("target");
        await expect(page.getByLabel("Docelowy build")).toHaveText(/Cel epicki/);
        await page.locator('input[accept=".json,.txt"]').setInputFiles({
            name: "BUILD (2).json",
            mimeType: "application/json",
            buffer: Buffer.from(JSON.stringify(epicTarget)),
        });
        await expect(page.getByLabel("Docelowy build")).toHaveValue("target");
        await expect(page.getByLabel("Docelowy build").locator("option:checked")).toHaveText(
            "BUILD (2)"
        );
        await expect(page.getByRole("alert")).toHaveCount(0);
        const planned = page.waitForResponse(
            (http) =>
                http.url().endsWith("/api/progression-path/plan") &&
                http.request().method() === "POST"
        );
        await page.getByLabel("Równomierny rozwój statystyk").check();
        await page.getByLabel(/Pomijaj zmianę ekwipunku/).fill("20");
        await page.getByLabel(/Pomijaj zmianę ekwipunku/).press("Tab");
        await page.getByRole("button", { name: "Zaplanuj ścieżkę", exact: true }).click();
        const http = await planned;
        expect(http.status()).toBe(200);
        expect(http.request().postDataJSON().balanceStats).toBe(true);
        expect(http.request().postDataJSON().minItemLevelGap).toBe(20);
        const report = await http.json();
        validate("ProgressionPlanResponse", report);
        expect(report.searchReport.stopReason).toBe("BALANCED_BACKWARD_PROJECTION");
        expect(report.stages.at(-1).stage.equipment).toEqual(epicTarget.build.requestData);
        const purchases = new Map();
        for (const entry of report.stages) {
            for (const [key, slot] of Object.entries(entry.stage.equipment.slots)) {
                if (slot.itemId == null) continue;
                const path = purchases.get(key) ?? [];
                if (path.at(-1)?.itemId !== slot.itemId)
                    path.push({ itemId: slot.itemId, level: entry.stage.characterLevel });
                purchases.set(key, path);
            }
        }
        for (const [key, path] of purchases) {
            for (let i = 0; i < path.length - 1; i++) {
                if (path[i].itemId !== epicTarget.build.requestData.slots[key].itemId)
                    expect(path[i + 1].level - path[i].level).toBeGreaterThanOrEqual(20);
            }
        }
        for (const stage of report.stages) {
            const calculation = await request.post("/api/calculator/calculate", {
                data: stage.stage.equipment,
            });
            expect(calculation.ok()).toBeTruthy();
            expect(await calculation.json()).toEqual(stage.calculation);
        }
        await expect(
            page.getByRole("heading", { name: "Plan rozwoju", exact: true })
        ).toBeVisible();
        await expect(page.locator(".progression-timeline > li")).toHaveCount(
            new Set(report.stages.map((entry) => entry.stage.characterLevel)).size
        );
        await expect(page.locator('.progression-stage-toggle[aria-expanded="true"]')).toHaveCount(
            1
        );
        await page
            .getByRole("heading", { name: "Plan rozwoju", exact: true })
            .evaluate((element) => element.scrollIntoView({ block: "start", behavior: "instant" }));
        await page.screenshot({
            path: testInfo.outputPath(`readable-plan-${mobile ? "mobile" : "desktop"}.png`),
        });
        await page.getByLabel("Twój poziom").fill("140");
        await page.getByLabel("Twój poziom").press("Tab");
        await expect(page.locator('[data-level="140"] .progression-stage-toggle')).toHaveAttribute(
            "aria-expanded",
            "true"
        );
        await page.reload();
        await expect(page.getByLabel("Równomierny rozwój statystyk")).toBeChecked();
        await expect(page.getByLabel(/Pomijaj zmianę ekwipunku/)).toHaveValue("20");
        await expect(page.getByLabel("Docelowy build")).toHaveValue("target");
        await expect(page.getByLabel("Docelowy build").locator("option:checked")).toHaveText(
            "BUILD (2)"
        );
        await expect(page.getByRole("alert")).toHaveCount(0);
    });
    test(`progression generates and exports a target path on ${mobile ? "mobile" : "desktop"}`, async ({
        page,
        request,
    }, testInfo) => {
        await page.setViewportSize(
            mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }
        );
        const response = await request.get("/api/initial-data");
        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        const weapon = data.items.find(
            (item) => item.rarity === "LEGENDARY" && item.allowedClasses.includes("FIRE_MAGE")
        );
        const helmet = data.items.find((item) => item.name === "Miłość Morany");
        const critical = data.drifs.find(
            (stone) => stone.size === "ARCYDRIF" && stone.bonusType === "CRITICAL_CHANCE"
        );
        const orb = data.orbs.find(
            (stone) => stone.size === "ARCYORB" && stone.category === "OFFENSIVE"
        );
        const doubleAttack = data.drifs.find(
            (stone) => stone.size === "ARCYDRIF" && stone.bonusType === "DOUBLE_ATTACK_CHANCE"
        );
        const magicDamage = data.drifs.find(
            (stone) => stone.size === "ARCYDRIF" && stone.bonusType === "DAMAGE_MAGIC"
        );
        const slot = (item, hasOrb = false) => ({
            itemId: item.id,
            itemStars: 9,
            drifIds: [critical.id],
            drifLevels: { 0: 21 },
            orbIds: hasOrb ? [orb.id] : [],
            orbLevels: hasOrb ? [3] : [],
        });
        const target = {
            format: "broken-ranks-tool-build",
            version: 3,
            build: {
                requestData: {
                    slots: { weapon: slot(weapon, true), helmet: slot(helmet) },
                    characterStats: {},
                },
                characterConfig: null,
                lockedSlots: [],
                lockedDrifs: {},
                backpack: [],
            },
        };
        Object.assign(target.build.requestData.slots.weapon, {
            drifIds: [critical.id, doubleAttack.id, magicDamage.id],
            drifLevels: { 0: 21, 1: 11, 2: 21 },
        });
        await page.goto(`/progression-path?ui=${mobile ? "mobile" : "desktop"}`);
        await expect(
            page.getByRole("heading", { name: "Ścieżka rozwoju", exact: true })
        ).toBeVisible();
        await expect(page.locator(".progression-workspace h1")).toHaveCSS(
            "font-family",
            /Inter.*sans-serif/
        );
        await expect(page.getByText("Od pierwszego zakupu do docelowego buildu")).toHaveCount(0);
        await page.getByLabel("Docelowy build").selectOption("file");
        await page.locator('input[accept=".json,.txt"]').setInputFiles({
            name: "cel.json",
            mimeType: "application/json",
            buffer: Buffer.from(JSON.stringify(target)),
        });
        await expect(page.getByLabel("Docelowy build").locator("option:checked")).toHaveText("cel");
        await expect(page.locator(".progression-source button, .progression-target")).toHaveCount(
            0
        );
        await expect(page.getByLabel("Profesja")).toHaveValue("FIRE_MAGE");
        await page.getByLabel("Pierścień 1", { exact: true }).check();
        const planned = page.waitForResponse(
            (http) =>
                http.url().endsWith("/api/progression-path/plan") &&
                http.request().method() === "POST"
        );
        await page.getByRole("button", { name: "Zaplanuj ścieżkę", exact: true }).click();
        const http = await planned;
        expect(http.status()).toBe(200);
        validate("ProgressionPlanRequest", http.request().postDataJSON());
        expect(http.request().postDataJSON().balanceStats).toBe(false);
        expect(http.request().postDataJSON().minItemLevelGap).toBe(0);
        const report = await http.json();
        validate("ProgressionPlanResponse", report);
        expect(report.outcome).toBe("VALID_PATH");
        expect(report.stages.length).toBeGreaterThan(6);
        expect(report.stages[0].stage.characterLevel).toBe(1);
        expect(report.resSlots).toEqual(["ring1"]);
        const upgrade = report.stages.findIndex((stage) =>
            stage.equipmentChanges.some((change) => change.includes("do legendy"))
        );
        expect(upgrade).toBeGreaterThan(0);
        expect(report.stages[upgrade - 1].stage.equipment.slots.weapon.itemStars).toBe(9);
        expect(report.stages[upgrade - 1].stage.characterLevel).toBe(120);
        expect(report.stages[upgrade].stage.equipment.slots.weapon.itemStars).toBe(1);
        expect(
            report.stages
                .filter((stage) => stage.stage.characterLevel === 140)
                .every((stage) => stage.stage.equipment.slots.weapon.itemId === weapon.id)
        ).toBe(true);
        expect(report.stages.at(-1).stage.equipment.slots.weapon).toEqual(
            target.build.requestData.slots.weapon
        );
        expect(
            report.stages
                .flatMap((stage) => stage.orbActions)
                .filter((action) => action.type === "ACQUIRE")
        ).toHaveLength(1);
        for (const stage of report.stages) {
            expect(stage.stage.equipment.slots.ring1.itemId).toBeNull();
            expect(stage.stage.equipment.slots.ring1.drifIds).toEqual([]);
            const calculation = await request.post("/api/calculator/calculate", {
                data: stage.stage.equipment,
            });
            expect(calculation.ok()).toBeTruthy();
            expect(await calculation.json()).toEqual(stage.calculation);
        }
        await expect(
            page.getByRole("heading", { name: "Plan rozwoju", exact: true })
        ).toBeVisible();
        await expect(page.locator(".progression-timeline > li")).toHaveCount(
            new Set(report.stages.map((entry) => entry.stage.characterLevel)).size
        );
        const epicCard = page.locator('[data-level="120"]');
        const legendCard = page.locator('[data-level="140"]');
        await expect(epicCard).toHaveCount(1);
        await expect(legendCard).toHaveCount(1);
        await page.getByLabel("Twój poziom").fill("120");
        await page.getByLabel("Twój poziom").press("Tab");
        await expect(page.locator('.progression-stage-toggle[aria-expanded="true"]')).toHaveCount(
            1
        );
        await expect(epicCard.locator(".progression-milestone-title")).toContainText("Żmij · epik");
        await expect(epicCard.locator(".progression-milestone-title")).not.toContainText("legenda");
        await epicCard.getByRole("checkbox", { name: "Poziom 120 wykonany" }).check();
        await expect(
            page.getByRole("button", { name: "Najbliższy etap: poziom 140", exact: true })
        ).toBeVisible();
        await expect(legendCard.locator(".progression-stage-toggle")).toHaveAttribute(
            "aria-expanded",
            "true"
        );
        if (mobile) {
            await expect(legendCard.locator(".progression-config")).toHaveCount(0);
            await legendCard.getByText("Szczegóły", { exact: true }).click();
            await expect(legendCard.locator(".progression-instructions ol")).toContainText(
                "Ulepsz epik Żmij (9★) do legendy (1★)."
            );
        } else {
            await expect(legendCard.locator(".progression-instructions")).toHaveCount(0);
            await legendCard.getByText("Szczegóły", { exact: true }).click();
            await expect(legendCard.getByText("Przed", { exact: true }).first()).toBeVisible();
            await expect(legendCard.getByText("Po", { exact: true }).first()).toBeVisible();
        }
        const stats = legendCard.getByRole("region", { name: "Podsumowanie statystyk" });
        await expect(stats.getByText(/^Szansa.*kryt/)).toBeVisible();
        await expect(stats.locator("dl > div")).toHaveCount(
            Object.keys(report.stages.at(-1).calculation.stats).length
        );
        await expect(stats.getByText("Statystyki nie uwzględniają synergetyków.")).toBeVisible();
        await stats.screenshot({
            path: testInfo.outputPath(`stage-stats-${mobile ? "mobile" : "desktop"}.png`),
        });
        expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
        ).toBe(true);
        await legendCard
            .locator(".progression-stage-toggle")
            .evaluate((element) => element.scrollIntoView({ block: "start", behavior: "instant" }));
        await page.screenshot({
            path: testInfo.outputPath(`level-140-${mobile ? "mobile" : "desktop"}.png`),
        });
        const downloadPromise = page.waitForEvent("download");
        await page.getByRole("button", { name: "Eksportuj ekwipunek etapu" }).last().click();
        const download = await downloadPromise;
        const exported = JSON.parse(await readFile(await download.path(), "utf8"));
        expect(exported.build.requestData).toEqual(report.stages.at(-1).stage.equipment);
        expect(exported.build.backpack).toEqual([]);
        expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
        ).toBe(true);
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({
            path: testInfo.outputPath(`progression-${mobile ? "mobile" : "desktop"}.png`),
            fullPage: false,
        });
        if (mobile) {
            await page.setViewportSize({ width: 320, height: 740 });
            expect(
                await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
            ).toBe(true);
        }
        const projectDownload = page.waitForEvent("download");
        await page.getByRole("button", { name: "Pobierz projekt", exact: true }).click();
        const projectFile = await projectDownload;
        await page.getByLabel("Poziom celu").fill("139");
        await page.getByLabel("Poziom celu").press("Tab");
        await page.getByLabel("Pierścień 1: res").uncheck();
        await page.getByLabel(/Pomijaj zmianę ekwipunku/).fill("35");
        await page.getByLabel(/Pomijaj zmianę ekwipunku/).press("Tab");
        await page
            .locator('input[type="file"][accept=".json"]')
            .setInputFiles(await projectFile.path());
        await expect(page.getByLabel("Poziom celu")).toHaveValue("140");
        await expect(page.getByLabel("Pierścień 1: res")).toBeChecked();
        await expect(page.getByLabel(/Pomijaj zmianę ekwipunku/)).toHaveValue("0");
        await page.reload();
        await expect(page.getByLabel("Poziom celu")).toHaveValue("140");
        await expect(page.getByRole("heading", { name: "Plan rozwoju", exact: true })).toHaveCount(
            0
        );
    });
}
