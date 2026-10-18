import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import {
    optimizerBuild,
    optimizerCatalog,
} from "../src/test/fixtures/equipment/optimizerScenario.js";

const priorities = [
    { key: "MANA_USAGE_REDUCTION", weight: 25, min: 1, max: 4 },
    { key: "DAMAGE_REDUCTION", weight: 20, min: 0, max: 3 },
    { key: "CRITICAL_CHANCE", weight: 5, min: 2, max: 6 },
];
const catalog = {
    ...optimizerCatalog,
    gameRules: {
        ...optimizerCatalog.gameRules,
        bonusTranslations: {
            ...optimizerCatalog.gameRules.bonusTranslations,
            DAMAGE_REDUCTION: "Redukcja obrażeń",
        },
        drifBasePowers: { ...optimizerCatalog.gameRules.drifBasePowers, DAMAGE_REDUCTION: 4 },
        drifBonusCategories: {
            ...optimizerCatalog.gameRules.drifBonusCategories,
            DAMAGE_REDUCTION: "DEFENSIVE",
        },
    },
};

for (const layout of ["desktop", "mobile"]) {
    const mode = "BUILD_FROM_SCRATCH";
    test(`${layout} ${mode} sorts displayed priorities by category without changing the request`, async ({
        page,
    }) => {
        await page.setViewportSize(
            layout === "desktop" ? { width: 1800, height: 1100 } : { width: 390, height: 844 }
        );
        await page.addInitScript(
            ({ build, goals, mode }) => {
                localStorage.setItem(
                    "broken-ranks-tool.equipment-draft.v3",
                    JSON.stringify({ version: 3, value: { ...build, backpack: [] } })
                );
                localStorage.setItem(
                    "broken-ranks-tool.optimizer-draft.v1",
                    JSON.stringify({
                        version: 1,
                        value: {
                            format: "broken-ranks-tool-optimizer-config",
                            version: 1,
                            settings: { mode, configurationMode: "ADVANCED" },
                            priorities: goals,
                        },
                    })
                );
            },
            { build: optimizerBuild, goals: priorities, mode }
        );
        await page.route("**/api/initial-data", (route) => route.fulfill({ json: catalog }));
        await page.route("**/api/calculator/calculate", (route) =>
            route.fulfill({ json: { stats: {} } })
        );
        const requests = [];
        await page.route("**/api/optimizer/drifs", (route) => {
            requests.push(route.request().postDataJSON());
            return route.fulfill({
                json: {
                    summary: {
                        outcome: "NO_BUILD_FOUND",
                        success: false,
                        message: "Nie znaleziono układu.",
                        nextVariants: [],
                    },
                },
            });
        });
        await page.goto(`/optimizer?ui=${layout}`);
        await page.getByRole("heading", { name: "Priorytety i limity", exact: true }).waitFor();
        const names = page.locator(".optimizer-priority-list .optimizer-priority-name");
        await expect(names).toHaveText([
            "Redukcja zużycia many",
            "Redukcja obrażeń",
            "Szansa na krytyk",
        ]);
        const run = page.getByRole("button", {
            name: /Uruchom optymalizację|Optymalizuj ponownie/i,
        });
        await run.click();
        await expect.poll(() => requests.length).toBe(1);
        await expect(run).toBeEnabled();
        const categories = page.getByRole("button", { name: "Kategorie", exact: true });
        await categories.click();
        await expect(categories).toHaveAttribute("aria-pressed", "true");
        await expect(names).toHaveText([
            "Szansa na krytyk",
            "Redukcja obrażeń",
            "Redukcja zużycia many",
        ]);
        const visibility = page.getByRole("group", { name: "Widoczne kategorie priorytetów" });
        await visibility.getByRole("button", { name: "Defensywne (1)", exact: true }).click();
        await expect(names).toHaveText(["Szansa na krytyk", "Redukcja zużycia many"]);
        await visibility.getByRole("button", { name: "Ofensywne (1)", exact: true }).click();
        await expect(names).toHaveText(["Redukcja zużycia many"]);
        await visibility.getByRole("button", { name: "Użytkowe (1)", exact: true }).click();
        await expect(names).toHaveCount(0);
        await expect(page.getByText("Priorytety są ukryte.", { exact: true })).toBeVisible();
        await expect(run).toBeEnabled();
        const naming = page.getByLabel("Nazwy modów", { exact: true });
        await naming.selectOption("DRIFS");
        const download = page.waitForEvent("download");
        await page.getByRole("button", { name: "Zapisz", exact: true }).click();
        const exported = JSON.parse(await readFile(await (await download).path(), "utf8"));
        expect(exported.priorities).toMatchObject(priorities);
        expect(JSON.stringify(exported)).not.toMatch(/Band|hiddenPriorityCategories|DRIFS/);
        await naming.selectOption("MODIFIERS");
        await run.click();
        await expect.poll(() => requests.length).toBe(2);
        expect(requests[1]).toEqual(requests[0]);
        await visibility.getByRole("button", { name: "Pokaż wszystkie", exact: true }).click();
        await expect(names).toHaveText([
            "Szansa na krytyk",
            "Redukcja obrażeń",
            "Redukcja zużycia many",
        ]);
        await page.getByRole("button", { name: "Zwiń", exact: true }).click();
        await categories.scrollIntoViewIfNeeded();
        await page
            .locator(".optimizer-priority-column, .mobile-optimizer-goals")
            .screenshot({ path: `../tmp/optimizer-priority-sorting-${layout}-${mode}.png` });
        await categories.click();
        await expect(names).toHaveText([
            "Redukcja zużycia many",
            "Redukcja obrażeń",
            "Szansa na krytyk",
        ]);
        await categories.click();
        await page.getByRole("button", { name: "Priorytet ↓", exact: true }).click();
        await expect(categories).toHaveAttribute("aria-pressed", "false");
        await expect(names).toHaveText([
            "Redukcja zużycia many",
            "Redukcja obrażeń",
            "Szansa na krytyk",
        ]);
        await expect(page.locator("html")).toHaveJSProperty(
            "scrollWidth",
            layout === "desktop" ? 1800 : 390
        );
    });
}
