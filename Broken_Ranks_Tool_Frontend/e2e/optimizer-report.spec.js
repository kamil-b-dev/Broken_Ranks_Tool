import { expect, test } from "@playwright/test";
import { builderCatalog } from "../src/test/fixtures/equipment/builderCatalog.js";

for (const layout of ["desktop", "mobile"]) {
    test(`${layout} presents the result and missing goals before optional diagnostics`, async ({
        page,
    }) => {
        await page.setViewportSize(
            layout === "desktop" ? { width: 1800, height: 1100 } : { width: 390, height: 844 }
        );
        const equipment = {
            itemId: "1",
            itemStars: 1,
            orbIds: [],
            orbLevels: [],
            drifIds: ["60"],
            drifLevels: { 0: 6 },
        };
        await page.addInitScript((slot) => {
            localStorage.setItem(
                "broken-ranks-tool.equipment-draft.v3",
                JSON.stringify({
                    version: 3,
                    value: {
                        requestData: { slots: { helmet: slot }, characterStats: {} },
                        backpack: [],
                        lockedSlots: [],
                        lockedDrifs: {},
                        characterConfig: null,
                    },
                })
            );
            localStorage.setItem(
                "broken-ranks-tool.optimizer-draft.v1",
                JSON.stringify({
                    version: 1,
                    value: {
                        format: "broken-ranks-tool-optimizer-config",
                        version: 1,
                        settings: { mode: "BUILD_FROM_SCRATCH", configurationMode: "ADVANCED" },
                        priorities: [
                            { key: "CRITICAL_CHANCE", weight: 15, min: 0, max: 12, forceCap: true },
                        ],
                    },
                })
            );
        }, equipment);
        await page.route("**/api/initial-data", (route) => route.fulfill({ json: builderCatalog }));
        await page.route("**/api/calculator/calculate", (route) =>
            route.fulfill({ json: { stats: { CRITICAL_CHANCE: "59.45%" } } })
        );
        await page.route("**/api/optimizer/drifs", (route) =>
            route.fulfill({
                json: {
                    optimizedSetup: { slots: { helmet: equipment }, characterStats: {} },
                    calculationResult: { stats: { CRITICAL_CHANCE: "59.45%" } },
                    summary: {
                        success: false,
                        outcome: "VALID_BUILD_SOFT_TARGETS_UNMET",
                        message:
                            "Zwrócono najlepszy sprawdzony poprawny układ, ale nie osiągnięto co najmniej jednego celu miękkiego; heurystyka nie dowodzi globalnego optimum.",
                        warnings: [
                            "Szansa na krytyk: 59,45% z 60%; brakuje 0,55 p.p.",
                            "Redukcja obrażeń: 23,08% z 40%; brakuje 16,92 p.p.",
                            "Szansa redukcji obrażeń: 29% z 30%; brakuje 1 p.p.",
                            "Podwójny atak: 59,18% z 60%; brakuje 0,82 p.p.",
                        ],
                        drifsPlaced: 1,
                        totalPowerUsed: 307,
                        executionTimeSeconds: 3.76,
                        searchReport: {
                            stopReason: "OPERATION_LIMIT",
                            evaluatedStates: 47327,
                            verifiedStates: 147,
                            proofComplete: false,
                        },
                        goalResults: [],
                        nextVariants: [],
                    },
                },
            })
        );
        await page.goto(`/optymalizator?ui=${layout}`);
        await page.getByRole("button", { name: /Uruchom optymalizację/i }).click();
        if (layout === "mobile") await page.getByRole("button", { name: "Pokaż wynik →" }).click();
        const report = page.locator(".optimizer-status-section");
        await expect(
            report.getByText("Układ jest gotowy. Nie wszystkie cele zostały osiągnięte.")
        ).toBeVisible();
        await expect(report.getByText("Ten układ jest obecnie założony.")).toBeVisible();
        await expect(
            report.getByText("Szansa na krytyk: 59,45% z 60%; brakuje 0,55 p.p.")
        ).toBeVisible();
        await expect(report.getByText("3,76 s")).toBeVisible();
        await expect(report.getByText("47327", { exact: true })).toHaveCount(0);
        await expect(report.getByText(/Osiągnięto limit obliczeń/)).not.toBeVisible();
        await expect(report.locator(".optimizer-status-message")).toHaveCSS(
            "text-transform",
            "none"
        );
        await report.evaluate((element) => element.scrollIntoView({ block: "center" }));
        await report.screenshot({ path: `../tmp/optimizer-report-${layout}.png` });
        await report.getByText("Szczegóły obliczeń", { exact: true }).click();
        await expect(report.getByText(/Osiągnięto limit obliczeń/)).toHaveText(
            "Osiągnięto limit obliczeń. Lepszy układ może jeszcze istnieć."
        );
        await expect(report.getByText(/Lepszy układ może jeszcze istnieć/)).toBeVisible();
        await expect(report.getByText(/Zajęta pojemność:/)).toHaveText("Zajęta pojemność: 307.");
        for (const label of ["Oceny stanów", "Przeliczenia kalkulatorem", "Podtryb"]) {
            await expect(report.getByText(label, { exact: true })).toHaveCount(0);
        }
        await expect(report.getByText("147", { exact: true })).toHaveCount(0);
        await report.evaluate((element) => element.scrollIntoView({ block: "center" }));
        await report.screenshot({ path: `../tmp/optimizer-report-details-${layout}.png` });
        await expect(page.locator("html")).toHaveJSProperty(
            "scrollWidth",
            layout === "desktop" ? 1800 : 390
        );
    });
}
