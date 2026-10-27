import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures/test.js";
import { mobileDevice } from "./mobile-device.js";
import { builderCatalog } from "../src/test/fixtures/equipment/builderCatalog.js";
import {
    legendReport,
    reportData,
} from "../src/features/progression-path/progressionReport.fixtures.js";

const catalog = {
    ...builderCatalog,
    drifs: [...builderCatalog.drifs, { ...builderCatalog.drifs[0], id: 61, size: "ARCYDRIF" }],
    items: [...builderCatalog.items, ...reportData.items],
    orbs: [...builderCatalog.orbs, ...reportData.orbs],
};
const slots = Object.fromEntries(
    ["helmet", "armor", "legs", "boots"].map((slotKey) => [
        slotKey,
        {
            itemId: builderCatalog.items.find((item) => item.category === slotKey.toUpperCase()).id,
            itemStars: 6,
            orbIds: [],
            orbLevels: [],
            drifIds: [61],
            drifLevels: { 0: 6 },
        },
    ])
);
const stats = { CRITICAL_CHANCE: "78%" };
const explanation = {
    stats,
    caps: { CRITICAL_CHANCE: 60 },
    contributions: {
        CRITICAL_CHANCE: [
            { source: { kind: "DEFAULT" }, baseValue: 2, value: 2, percentage: true },
            ...Object.keys(slots).map((slotKey) => ({
                source: {
                    kind: "DRIF",
                    slotKey,
                    itemName: builderCatalog.items.find((item) => item.id === slots[slotKey].itemId)
                        .name,
                    itemStars: 6,
                    stoneName: "Band",
                    size: "ARCYDRIF",
                    level: 6,
                    socketIndex: 0,
                    builtIn: false,
                    itemBonus: 0,
                    starBonus: 0,
                    repeatCount: 4,
                    penaltyMultiplier: 0.95,
                },
                baseValue: 20,
                value: 19,
                percentage: true,
            })),
        ],
    },
};
for (const mobile of [false, true]) {
    test.describe(
        mobile ? "mobile statistic explanations" : "desktop statistic explanations",
        () => {
            if (mobile) test.use(mobileDevice);
            test.beforeEach(async ({ page, browserName }) => {
                test.skip(!mobile && browserName === "webkit", "Desktop covered by Chromium.");
                await page.route("**/api/initial-data", (route) =>
                    route.fulfill({ json: catalog })
                );
                await page.route("**/api/calculator/calculate**", (route) =>
                    route.fulfill({
                        json:
                            new URL(route.request().url()).searchParams.get("explain") === "true"
                                ? explanation
                                : { stats, drifCategories: { CRITICAL_CHANCE: "OFFENSIVE" } },
                    })
                );
                await page.route("**/api/progression-path/plan", (route) =>
                    route.fulfill({ json: legendReport() })
                );
                await page.addInitScript(
                    ({ slots }) => {
                        if (!localStorage.getItem("broken-ranks-tool.equipment-draft.v3"))
                            localStorage.setItem(
                                "broken-ranks-tool.equipment-draft.v3",
                                JSON.stringify({
                                    version: 3,
                                    value: {
                                        requestData: { slots, characterStats: {} },
                                        characterConfig: null,
                                        lockedSlots: [],
                                        lockedDrifs: {},
                                        backpack: [],
                                    },
                                })
                            );
                    },
                    { slots }
                );
            });
            test("explains the current statistic without upgrade hints in the editor", async ({
                page,
            }, testInfo) => {
                let requests = 0;
                page.on("request", (request) => {
                    if (request.url().includes("explain=true")) requests++;
                });
                await page.goto("/builder");
                if (mobile)
                    await page.getByRole("button", { name: "Statystyki", exact: true }).click();
                await page
                    .getByRole("button", { name: "Przelicz statystyki", exact: true })
                    .click();
                const opener = page.getByRole("button", {
                    name: "Szansa na krytyk 78%",
                    exact: true,
                });
                await expect(opener).toBeVisible();
                await expect(opener.locator(".stat-drif-count")).toHaveText("4");
                await expect(opener.locator(".stat-drif-multiplier")).toHaveText("0,95");
                await expect(
                    page.locator(".stat-columns-heading").getByText("Mnożnik", { exact: true })
                ).toHaveCount(1);
                await expect(opener).toHaveAttribute(
                    "aria-description",
                    "Ilość drifów: 4 · Mnożnik: 0,95 · Cap: 60%"
                );
                await expect(opener.locator(".stat-cap")).toHaveText("Cap: 60%");
                expect(requests).toBe(0);
                await opener.click();
                const dialog = page.getByRole("dialog");
                await expect(dialog.locator(".stat-repeat-summary")).toContainText("Ilość drifów:");
                await expect(dialog.locator(".stat-repeat-summary")).toContainText("Mnożnik:");
                await expect(dialog.locator(".stat-repeat-summary dd").last()).toHaveText("0,95");
                await expect(dialog.getByText(/Składniki pokazano/)).toHaveCount(0);
                await expect(dialog.getByText(/Nadmiar bez dodatkowej korzyści: 18/)).toBeVisible();
                await dialog.locator(".stat-source-list summary").nth(1).click();
                await expect(dialog.getByText("Bonus gwiazdek do drifów").first()).toBeVisible();
                expect(
                    (
                        await new AxeBuilder({ page })
                            .include(".stat-explanation")
                            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
                            .analyze()
                    ).violations
                ).toEqual([]);
                if (mobile) {
                    const box = await dialog.boundingBox();
                    expect(box.x).toBe(0);
                    expect(Math.round(box.width)).toBe(page.viewportSize().width);
                    expect(Math.round(box.height)).toBe(page.viewportSize().height);
                }
                await page.screenshot({
                    path: testInfo.outputPath("stat-explanation.png"),
                    fullPage: true,
                });
                await dialog.getByRole("button", { name: "Wróć do statystyk" }).click();
                await expect(opener).toBeFocused();
                await opener.click();
                expect(requests).toBe(1);
                await page.getByRole("button", { name: "Wróć do statystyk" }).click();
                if (mobile) {
                    await page.getByRole("button", { name: "Ekwipunek", exact: true }).click();
                    await page
                        .getByRole("button", { name: "Edytuj slot: Hełm", exact: true })
                        .click();
                }
                await expect(page.locator(".upgrade-hints")).toHaveCount(0);
                await page.screenshot({ path: testInfo.outputPath("equipment-editor.png") });
            });
            test("persists prepared supplies and downloads the shopping list", async ({
                page,
            }, testInfo) => {
                await page.goto("/progression-path");
                await page.getByLabel("Docelowy build").selectOption("current");
                await page.getByRole("button", { name: "Zaplanuj ścieżkę", exact: true }).click();
                const list = page.locator(".progression-shopping");
                await list.locator("summary").click();
                const prepared = list.getByRole("checkbox").first();
                await prepared.check();
                await page.reload();
                await page.getByRole("button", { name: "Odtwórz plan", exact: true }).click();
                await list.locator("summary").click();
                await expect(list.getByRole("checkbox").first()).toBeChecked();
                const download = page.waitForEvent("download");
                await list.getByRole("button", { name: "Pobierz listę TXT" }).click();
                expect(await readFile(await (await download).path(), "utf8")).toContain("[x]");
                await page.screenshot({
                    path: testInfo.outputPath("shopping-list.png"),
                    fullPage: true,
                });
                expect(
                    (
                        await new AxeBuilder({ page })
                            .include(".progression-shopping")
                            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
                            .analyze()
                    ).violations
                ).toEqual([]);
            });
        }
    );
}
