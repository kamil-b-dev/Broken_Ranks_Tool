import { expect, test } from "@playwright/test";
import {
    optimizerBuild,
    optimizerCatalog,
    optimizerResponse,
} from "../src/test/fixtures/equipment/optimizerScenario.js";

const catalog = {
    ...optimizerCatalog,
    drifs: [
        ...optimizerCatalog.drifs,
        {
            id: 70,
            name: "Abaf",
            bonusType: "DAMAGE_MAGIC",
            category: "OFFENSIVE",
            size: "SUBDRIF",
            baseValue: "10%",
            increment: "0%",
        },
        {
            id: 71,
            name: "Teld",
            bonusType: "MANA_USAGE_REDUCTION",
            category: "UTILITY",
            size: "SUBDRIF",
            baseValue: "10%",
            increment: "0%",
        },
    ],
    gameRules: {
        ...optimizerCatalog.gameRules,
        bonusTranslations: {
            ...optimizerCatalog.gameRules.bonusTranslations,
            DAMAGE_MAGIC: "Modyfikator obrażeń magicznych",
        },
        drifBasePowers: { ...optimizerCatalog.gameRules.drifBasePowers, DAMAGE_MAGIC: 3 },
        drifBonusCategories: {
            ...optimizerCatalog.gameRules.drifBonusCategories,
            DAMAGE_MAGIC: "OFFENSIVE",
        },
    },
};
const stats = { DAMAGE_MAGIC: "20%", CRITICAL_CHANCE: "12%", MANA_USAGE_REDUCTION: "-10%" };
const normalizeRequest = (request) => {
    const copy = structuredClone(request);
    if (copy.advisor) {
        delete copy.advisor.runId;
        delete copy.advisor.cancellationToken;
    }
    return copy;
};

for (const layout of ["desktop", "mobile"]) {
    for (const mode of ["SIMPLE", "ADVANCED", "REORGANIZE", "ADVISOR"]) {
        test(`${layout} ${mode} switches modifier names throughout the optimizer and remembers the preference`, async ({
            page,
        }) => {
            await page.setViewportSize(
                layout === "desktop" ? { width: 1800, height: 1100 } : { width: 390, height: 844 }
            );
            await page.addInitScript(
                ({ build, mode }) => {
                    localStorage.setItem(
                        "broken-ranks-tool.equipment-draft.v3",
                        JSON.stringify({ version: 3, value: { ...build, backpack: [] } })
                    );
                    if (!localStorage.getItem("broken-ranks-tool.optimizer-draft.v1"))
                        localStorage.setItem(
                            "broken-ranks-tool.optimizer-draft.v1",
                            JSON.stringify({
                                version: 1,
                                value: {
                                    format: "broken-ranks-tool-optimizer-config",
                                    version: 1,
                                    settings: {
                                        mode: ["REORGANIZE", "ADVISOR"].includes(mode)
                                            ? mode
                                            : "BUILD_FROM_SCRATCH",
                                        configurationMode:
                                            mode === "SIMPLE" ? "SIMPLE" : "ADVANCED",
                                        simpleProfile: "FIRE_MAGE",
                                        advisorGoal: "DAMAGE_MAGIC",
                                    },
                                    priorities: [
                                        { key: "DAMAGE_MAGIC", weight: 15, min: 0, max: 12 },
                                        { key: "CRITICAL_CHANCE", weight: 5, min: 0, max: 12 },
                                    ],
                                },
                            })
                        );
                },
                { build: optimizerBuild, mode }
            );
            await page.route("**/api/initial-data", (route) => route.fulfill({ json: catalog }));
            await page.route("**/api/calculator/calculate", (route) =>
                route.fulfill({ json: { stats } })
            );
            const requests = [];
            await page.route("**/api/optimizer/drifs", (route) => {
                requests.push(route.request().postDataJSON());
                const response = optimizerResponse(mode === "ADVISOR");
                response.optimizedSetup = optimizerBuild.requestData;
                response.calculationResult = { stats };
                response.summary.warnings = [
                    "Modyfikator obrażeń magicznych: 20% z 30%; brakuje 10 p.p.",
                ];
                response.summary.goalResults.unshift({
                    statKey: "DAMAGE_MAGIC",
                    bonusName: "Modyfikator obrażeń magicznych",
                    priority: 15,
                    minimumCount: 0,
                    maximumCount: 12,
                    placedCount: 0,
                    calculatorValue: "20%",
                    targetLabel: "30%",
                });
                const variant = response.summary.nextVariants[0];
                variant.setup = optimizerBuild.requestData;
                variant.bonusName = "Modyfikator obrażeń magicznych";
                variant.calculationResult = { stats };
                variant.statChanges.unshift({
                    statKey: "DAMAGE_MAGIC",
                    finalValue: "19%",
                    variantValue: "20%",
                });
                response.summary.nextVariants.push({ ...variant, main: false });
                if (mode === "REORGANIZE")
                    response.reorganizationDrifUsages = [
                        {
                            entryId: null,
                            sourceSlotKey: "helmet",
                            sourceDrifIndex: 0,
                            slotKey: "helmet",
                            drifIndex: 0,
                        },
                    ];
                return route.fulfill({ json: response });
            });
            await page.goto(`/optimizer?ui=${layout}`);
            const naming = page.getByLabel("Nazwy modów", { exact: true });
            await expect(naming).toHaveValue("MODIFIERS");
            await naming.selectOption("DRIFS");
            if (mode === "SIMPLE")
                await expect(page.getByLabel("Drify Abaf", { exact: true })).toBeVisible();
            else if (mode === "ADVISOR") {
                await expect(page.getByLabel("Główny cel")).toContainText("Popraw: Abaf");
                await expect(page.getByLabel("Dopuszczalny spadek: Band")).toBeVisible();
            } else if (mode === "REORGANIZE") {
                await page.getByText("Ustawienia zaawansowane", { exact: true }).click();
                await expect(
                    page.getByRole("checkbox", { name: "Band", exact: true })
                ).toBeVisible();
                await expect(
                    page.getByRole("spinbutton", {
                        name: "Dopuszczalny spadek dla: Band",
                        exact: true,
                    })
                ).toBeVisible();
                await page.getByLabel("Maksymalna liczba przełożeń").fill("7");
                await naming.selectOption("MODIFIERS");
                await expect(
                    page.getByRole("checkbox", { name: "Szansa na krytyk", exact: true })
                ).toBeVisible();
                await expect(page.getByLabel("Maksymalna liczba przełożeń")).toHaveValue("7");
                expect(requests).toHaveLength(0);
                await naming.selectOption("DRIFS");
                await expect
                    .poll(() =>
                        page.evaluate(() =>
                            Number(
                                JSON.parse(
                                    localStorage.getItem("broken-ranks-tool.optimizer-draft.v1")
                                ).value.settings.reorganization?.maxMoves
                            )
                        )
                    )
                    .toBe(7);
                await page.reload();
                await expect(naming).toHaveValue("DRIFS");
                await page.getByText("Ustawienia zaawansowane", { exact: true }).click();
                await expect(
                    page.getByRole("checkbox", { name: "Band", exact: true })
                ).toBeVisible();
                await expect(page.getByLabel("Maksymalna liczba przełożeń")).toHaveValue("7");
                return;
            } else {
                await expect(page.locator(".optimizer-priority-name").first()).toHaveText("Abaf");
                if (layout === "mobile") {
                    await page.getByRole("button", { name: "＋ Dodaj cel" }).click();
                    const search = page.getByRole("searchbox", { name: "Szukaj bonusu" });
                    await search.fill("Teld");
                    await expect(
                        page.getByRole("dialog").getByRole("button", { name: /Teld/ })
                    ).toBeVisible();
                    await search.fill("zużycia many");
                    await expect(
                        page.getByRole("dialog").getByRole("button", { name: /Teld/ })
                    ).toBeVisible();
                    await page.getByRole("button", { name: "Zamknij wybór celu" }).click();
                } else {
                    const search = page.getByLabel("Szukaj statystyki do optymalizacji");
                    await search.fill("Teld");
                    await expect(page.locator(".optimizer-bonus-card")).toContainText("Teld");
                    await search.fill("zużycia many");
                    await expect(page.locator(".optimizer-bonus-card")).toContainText("Teld");
                }
            }
            const run = page.getByRole("button", {
                name: /Uruchom optymalizację|Optymalizuj ponownie|Analizuj build|Analizuj ponownie/i,
            });
            await expect(run).toBeEnabled();
            await run.click();
            await expect.poll(() => requests.length).toBe(1);
            await expect(run).toBeEnabled();
            if (layout === "mobile")
                await page.getByRole("button", { name: "Pokaż wynik →" }).click();
            const report = page.locator(
                layout === "desktop" ? ".optimizer-info-column" : ".mobile-optimizer-report"
            );
            await expect(report.locator(".optimizer-goal-name").first()).toContainText("Abaf");
            await expect(report.locator(".optimizer-status-warnings")).toContainText(
                "Abaf: 20% z 30%"
            );
            await expect(report.locator(".optimizer-variant-copy").last()).toContainText("Abaf");
            await expect(report.locator(".optimizer-stat-change-list")).toContainText(
                "Abaf: 19% → 20%"
            );
            await naming.selectOption("MODIFIERS");
            await expect(report.locator(".optimizer-goal-name").first()).toContainText(
                "Modyfikator obrażeń magicznych"
            );
            await expect(report.locator(".optimizer-status-warnings")).toContainText(
                "Modyfikator obrażeń magicznych: 20% z 30%"
            );
            expect(requests).toHaveLength(1);
            await naming.selectOption("DRIFS");
            await run.click();
            await expect.poll(() => requests.length).toBe(2);
            expect(normalizeRequest(requests[1])).toEqual(normalizeRequest(requests[0]));
            await page.reload();
            await expect(naming).toHaveValue("DRIFS");
            if (mode === "ADVANCED") {
                if (layout === "mobile") {
                    await page
                        .getByRole("navigation", { name: "Sekcje optymalizatora" })
                        .getByRole("button", { name: "Cele", exact: true })
                        .click();
                }
                await page.getByRole("button", { name: "Zwiń", exact: true }).click();
                await naming.evaluate((element) => element.scrollIntoView({ block: "center" }));
                await page.screenshot({ path: `../tmp/optimizer-labels-${layout}.png` });
            }
            await expect(page.locator("html")).toHaveJSProperty(
                "scrollWidth",
                layout === "desktop" ? 1800 : 390
            );
        });
    }
}
