import { expect, test } from "./fixtures/test.js";
import { Buffer } from "node:buffer";
import { translate } from "../src/shared/i18n/translation.js";
import AxeBuilder from "@axe-core/playwright";
import { builderCatalog } from "../src/test/fixtures/equipment/builderCatalog.js";
import { createBuildPayload } from "../src/features/builds/buildPayload.js";
import { createLocalBuildRecord } from "../src/features/builds/buildLibraryStorage.js";

const slot = (itemId, drifIds = [], drifLevels = {}) => ({
    itemId,
    itemStars: 1,
    drifIds,
    drifLevels,
    orbIds: [],
    orbLevels: [],
});
const equipment = {
    requestData: { slots: { helmet: slot(1, [60], { 0: 2 }), armor: slot(2) }, characterStats: {} },
    characterConfig: null,
    lockedSlots: [],
    lockedDrifs: {},
    backpack: [],
};
const builds = [2, 6].map((level) =>
    createLocalBuildRecord({
        id: `build-${level}`,
        name: `Żmij ${level}`,
        snapshot: {
            payload: createBuildPayload({
                ...equipment,
                requestData: {
                    ...equipment.requestData,
                    slots: { helmet: slot(1, [60], { 0: level }) },
                },
            }),
            stats: { CRITICAL_CHANCE: `${level}%` },
        },
    })
);
const accessible = async (page) => {
    const scan = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
    expect(scan.violations).toEqual([]);
};

for (const language of ["pl", "en"]) {
    for (const layout of ["desktop", "mobile"]) {
        for (const route of ["/builds", "/progression-path", "/optimizer"]) {
            test(`${language} ${layout} ${route} supports keyboard controls and WCAG A/AA`, async ({
                page,
            }) => {
                const t = (message) => translate(message, language);
                await page.addInitScript(
                    ({ language, equipment, builds }) => {
                        localStorage.setItem("broken-ranks-tool.language.v1", language);
                        localStorage.setItem(
                            "broken-ranks-tool.equipment-draft.v3",
                            JSON.stringify({ version: 3, value: equipment })
                        );
                        localStorage.setItem(
                            "broken-ranks-tool.build-library.v1",
                            JSON.stringify({ version: 1, builds })
                        );
                    },
                    { language, equipment, builds }
                );
                await page.setViewportSize({
                    width: layout === "mobile" ? 390 : 1440,
                    height: 1000,
                });
                await page.route("**/api/initial-data", (route) =>
                    route.fulfill({ json: builderCatalog })
                );
                await page.route("**/api/calculator/calculate", (route) =>
                    route.fulfill({ json: { stats: {} } })
                );
                await page.goto(`${route}?ui=${layout}`);
                await expect(page.locator("#workspace-content")).toBeVisible();
                if (route === "/optimizer") {
                    if (layout === "mobile")
                        await page.getByLabel(t("Tryb optymalizatora")).selectOption("REORGANIZE");
                    else
                        await page
                            .getByRole("button", { name: t("Reorganizacja"), exact: true })
                            .press("Enter");
                    const task = page.getByRole("button", {
                        name: t("Zwolnij miejsce"),
                        exact: true,
                    });
                    await task.focus();
                    await page.keyboard.press("Enter");
                    await expect(task).toHaveAttribute("aria-pressed", "true");
                    const advanced = page.getByText(t("Ustawienia zaawansowane"), { exact: true });
                    await advanced.focus();
                    await page.keyboard.press("Enter");
                    await expect(page.getByLabel(t("Maksymalna liczba przełożeń"))).toBeVisible();
                    await page.getByLabel(t("Wymagane wolne gniazda")).fill("3");
                    await page.route("**/api/optimizer/drifs", (route) =>
                        route.fulfill({
                            json: {
                                optimizedSetup: {
                                    slots: { helmet: slot(1), armor: slot(2, [60], { 0: 2 }) },
                                    characterStats: {},
                                },
                                reorganizationDrifUsages: [
                                    {
                                        entryId: null,
                                        sourceSlotKey: "helmet",
                                        sourceDrifIndex: 0,
                                        slotKey: "armor",
                                        drifIndex: 0,
                                    },
                                ],
                                reorganizationStatChanges: [],
                                calculationResult: { stats: {} },
                                summary: {
                                    success: true,
                                    outcome: "VALID_BUILD",
                                    warnings: ["Statystyki nie uwzględniają synergetyków."],
                                    nextVariants: [],
                                },
                            },
                        })
                    );
                    await page
                        .getByRole("button", { name: new RegExp(t("Uruchom optymalizację"), "i") })
                        .press("Enter");
                    if (layout === "mobile")
                        await page
                            .getByRole("button", { name: t("Pokaż wynik →"), exact: true })
                            .press("Enter");
                    const report = page.getByRole("region", {
                        name: t("Wynik reorganizacji"),
                        exact: true,
                    });
                    await expect(report).toBeVisible();
                    await expect(report.getByRole("list").first()).toContainText("Band");
                    await expect(page.locator(".optimizer-status-warnings")).toHaveText(
                        t("Statystyki nie uwzględniają synergetyków.")
                    );
                    await page
                        .getByRole("button", { name: t("Cofnij reorganizację"), exact: true })
                        .focus();
                    await expect(
                        page.getByRole("button", { name: t("Cofnij reorganizację"), exact: true })
                    ).toBeFocused();
                } else if (route === "/progression-path") {
                    const target = page.getByRole("combobox", {
                        name: t("Docelowy build"),
                        exact: true,
                    });
                    await target.focus();
                    await page.keyboard.press("Tab");
                    await expect(target).not.toBeFocused();
                    await page.route("**/api/progression-path/plan", (route) =>
                        route.fulfill({
                            json: {
                                outcome: "VALID_PATH",
                                warnings: [
                                    "Plan nie wycenia zakupów ani ulepszeń. Zwykłe przedmioty są pominięte.",
                                ],
                                remainingDrifs: [],
                                resSlots: [],
                                stages: [1, 140].map((level) => ({
                                    stage: {
                                        id: `level-${level}`,
                                        characterLevel: level,
                                        equipment: { slots: {}, characterStats: {} },
                                    },
                                    calculation: { stats: {} },
                                    actions: [],
                                    orbActions: [],
                                    equipmentChanges: [],
                                })),
                            },
                        })
                    );
                    await target.selectOption("current");
                    await page
                        .getByRole("button", { name: t("Zaplanuj ścieżkę"), exact: true })
                        .click();
                    const completed = page.getByRole("checkbox", {
                        name: t("Poziom 140 wykonany"),
                        exact: true,
                    });
                    await completed.focus();
                    await page.keyboard.press("Space");
                    await expect(completed).toBeChecked();
                    await page.getByText(t("Założenia planu"), { exact: true }).press("Enter");
                    await expect(
                        page.getByText(
                            t(
                                "Plan nie wycenia zakupów ani ulepszeń. Zwykłe przedmioty są pominięte."
                            ),
                            { exact: true }
                        )
                    ).toBeVisible();
                    await page.locator('input[accept=".json"]').setInputFiles({
                        name: "invalid-project.json",
                        mimeType: "application/json",
                        buffer: Buffer.from("{}"),
                    });
                    await expect(page.getByRole("alert")).toHaveText(
                        t("Nieobsługiwany lub niepoprawny projekt ścieżki.")
                    );
                } else {
                    const choices = page.getByRole("checkbox", {
                        name: t("Porównaj"),
                        exact: true,
                    });
                    for (let index = 0; index < 2; index++) {
                        await choices.nth(index).focus();
                        await page.keyboard.press("Space");
                        await expect(choices.nth(index)).toBeChecked();
                    }
                    await expect(page.locator(".build-comparison-hero")).toHaveCount(2);
                    await expect(page.locator(".build-comparison-hero").first()).toContainText(
                        "Żmij 2"
                    );
                    const tabs = page.getByRole("tablist");
                    const first = tabs.getByRole("tab", { name: t("Ekwipunek"), exact: true });
                    await first.focus();
                    await accessible(page);
                    await page.keyboard.press("ArrowRight");
                    await expect(
                        tabs.getByRole("tab", { name: t("Postać i orby"), exact: true })
                    ).toBeFocused();
                    await accessible(page);
                    if (layout === "mobile") {
                        const table = page.locator(
                            "#build-comparison-panel-character .build-comparison-table"
                        );
                        await table.focus();
                        await expect(table).toBeFocused();
                        await page.keyboard.press("ArrowRight");
                        await expect
                            .poll(() => table.evaluate((element) => element.scrollLeft))
                            .toBeGreaterThan(0);
                        await tabs
                            .getByRole("tab", { name: t("Postać i orby"), exact: true })
                            .focus();
                    }
                    await page.keyboard.press("End");
                    await expect(
                        tabs.getByRole("tab", { name: t("Drify"), exact: true })
                    ).toBeFocused();
                    await expect(
                        tabs.getByRole("tab", { name: t("Drify"), exact: true })
                    ).toHaveAttribute("aria-selected", "true");
                }
                await accessible(page);
            });
        }
    }
}
