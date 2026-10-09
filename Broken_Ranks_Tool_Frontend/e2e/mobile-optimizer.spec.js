import { expect, test } from "@playwright/test";
import { mobileDevice } from "./mobile-device";
import AxeBuilder from "@axe-core/playwright";
import {
    optimizerBuild,
    optimizerCatalog,
    optimizerResponse,
} from "../src/test/fixtures/equipment/optimizerScenario.js";

test.use(mobileDevice);

test.beforeEach(async ({ page }) => {
    await page.addInitScript(
        (build) =>
            localStorage.setItem(
                "broken-ranks-tool.equipment-draft.v1",
                JSON.stringify({ version: 1, value: build })
            ),
        optimizerBuild
    );
    await page.route("**/api/initial-data", (route) => route.fulfill({ json: optimizerCatalog }));
    await page.route("**/api/calculator/calculate", (route) =>
        route.fulfill({ json: { stats: { CRITICAL_CHANCE: "12%", MANA_USAGE_REDUCTION: "-10%" } } })
    );
});
const section = (page, name) =>
    page
        .getByRole("navigation", { name: "Sekcje optymalizatora" })
        .getByRole("button", { name, exact: true });
const draft = (page) =>
    page.evaluate(
        () => JSON.parse(localStorage.getItem("broken-ranks-tool.equipment-draft.v1")).value
    );
const noOverflow = async (page) =>
    expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    ).toBe(true);
const accessible = async (page) => {
    const scan = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
    expect(scan.violations).toEqual([]);
};

test("simple optimization keeps its run between sections and shows unmet target values", async ({
    page,
}) => {
    let request;
    let finish;
    await page.route("**/api/optimizer/drifs", async (route) => {
        request = route.request().postDataJSON();
        await new Promise((resolve) => {
            finish = resolve;
        });
        await route.fulfill({ json: optimizerResponse() });
    });
    await page.goto("/optymalizator");
    await page.getByLabel("Profil prostego optymalizatora").selectOption("DRUID");
    await page.getByLabel("Styl buildu").selectOption("DEFENSIVE");
    await page.setViewportSize({ width: 320, height: 740 });
    await noOverflow(page);
    await accessible(page);
    await page.getByRole("button", { name: "Uruchom optymalizację" }).tap();
    await expect.poll(() => request?.configurationMode).toBe("SIMPLE");
    await section(page, "Blokady").tap();
    await expect(page.getByRole("button", { name: /Analiza trwa/ })).toBeDisabled();
    finish();
    await expect(page.getByRole("button", { name: "Pokaż wynik →" })).toBeVisible();
    await expect(section(page, "Blokady")).toHaveAttribute("aria-current", "page");
    await page.getByRole("button", { name: "Pokaż wynik →" }).tap();
    await expect(page.locator(".optimizer-goal-target")).toContainText("60%");
    await expect(page.locator(".optimizer-goal-target")).toBeVisible();
    await expect(page.locator(".optimizer-goal-status")).toContainText("Częściowo");
    await noOverflow(page);
    await accessible(page);
    await page.screenshot({
        path: "../tmp/mobile-ui-audit/optimizer-result-320.png",
        fullPage: true,
    });
});

test("advanced goals are searchable and all constraints stay editable at phone widths", async ({
    page,
}) => {
    await page.goto("/optymalizator");
    await page.getByLabel("Tryb optymalizatora").selectOption("ADVANCED");
    await page.getByRole("button", { name: "＋ Dodaj cel" }).tap();
    await page.getByRole("searchbox", { name: "Szukaj bonusu" }).fill("brak");
    await expect(page.getByRole("status")).toContainText("Brak pasujących");
    await accessible(page);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "＋ Dodaj cel" })).toBeFocused();
    await page.getByRole("button", { name: "＋ Dodaj cel" }).tap();
    await page.getByRole("searchbox").fill("krytyk");
    await page.getByRole("button", { name: /Szansa na krytyk/ }).tap();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByLabel("Wymuś konkretny procent dla Szansa na krytyk").tap();
    await page.getByLabel("Wymuszony procent dla Szansa na krytyk").fill("60");
    await page.getByText("Rozmiary drifów", { exact: true }).tap();
    await page.getByLabel("Ogranicz SUBDRIF dla Szansa na krytyk").check();
    await page.getByLabel("Minimum SUBDRIF dla Szansa na krytyk").fill("1");
    await page.getByText("Opcje i warianty").tap();
    await page.getByLabel("Obliczaj dodatkowe warianty").check();
    await page.getByLabel("Maksymalna strata wariantu (%)").fill("5");
    for (const width of [320, 390, 768, 1024]) {
        await page.setViewportSize({ width, height: 844 });
        await noOverflow(page);
        const controls = await page.locator(".optimizer-priority-toggle").evaluateAll((buttons) =>
            buttons.map((button) => ({
                width: button.getBoundingClientRect().width,
                height: button.getBoundingClientRect().height,
            }))
        );
        expect(controls.every(({ width, height }) => width >= 44 && height >= 44)).toBe(true);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await accessible(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
        path: "../tmp/mobile-ui-audit/optimizer-advanced-390.png",
        fullPage: true,
    });
    await section(page, "Blokady").tap();
    await section(page, "Cele").tap();
    await expect(page.getByLabel("Wymuszony procent dla Szansa na krytyk")).toHaveValue("60");
});

test("advisor preserves settings, cancels from another section and rejects a stale plan", async ({
    page,
}) => {
    let request;
    let finish;
    let cancellation;
    await page.route("**/api/optimizer/drifs", async (route) => {
        request = route.request().postDataJSON();
        await new Promise((resolve) => {
            finish = resolve;
        });
        await route.fulfill({ json: optimizerResponse(true, "CANCELLED") });
    });
    await page.route("**/api/optimizer/advisor/*/cancel", async (route) => {
        cancellation = route.request().headers()["x-advisor-cancellation-token"];
        await route.fulfill({ json: { cancelled: true } });
        finish();
    });
    await page.goto("/optymalizator");
    await page.getByLabel("Tryb optymalizatora").selectOption("ADVISOR");
    await page.getByLabel("Główny cel").selectOption("CRITICAL_CHANCE");
    await page.getByLabel("Oczekiwany efekt").selectOption("VALUE");
    await page.getByLabel("Wartość celu (%)").fill("60");
    await page.getByLabel("Dopuszczalny spadek: Redukcja zużycia many").fill("3");
    await page.getByLabel("Strategia planu").selectOption("BEST_RESULT");
    await page.setViewportSize({ width: 320, height: 740 });
    await noOverflow(page);
    await accessible(page);
    await section(page, "Dozwolone zmiany").tap();
    await page.getByLabel("Ulepszanie drifów").check();
    await page.getByLabel("Maksymalna liczba działań w planie").selectOption("10");
    await page.getByLabel("Budżet czasu analizy").selectOption("6000");
    await page.getByRole("button", { name: "Analizuj build" }).tap();
    await expect.poll(() => request?.advisor?.maxActions).toBe(10);
    expect(request.advisor).toMatchObject({
        strategy: "BEST_RESULT",
        timeBudgetMs: 6000,
        allowedChanges: { drifUpgrades: true },
    });
    await section(page, "Build i blokady").tap();
    await page.getByRole("button", { name: "Zatrzymaj i pokaż znalezione plany" }).tap();
    await expect.poll(() => cancellation).toBe(request.advisor.cancellationToken);
    await section(page, "Porady").tap();
    await expect(page.getByLabel("Plan zmian")).toContainText("Przenieś SUBDRIF Band 6");
    await expect(page.getByText("Analiza anulowana", { exact: true })).toBeVisible();
    expect((await draft(page)).requestData.slots.helmet.drifIds).toEqual([60]);
    await accessible(page);
    await section(page, "Build i blokady").tap();
    await page
        .locator(".optimizer-lock-card")
        .filter({ hasText: "Hełm podróżnika" })
        .getByRole("button", { name: "Zablokuj cały slot" })
        .tap();
    await section(page, "Porady").tap();
    await page.getByRole("button", { name: "Zastosuj wybrany wariant" }).tap();
    await expect(page.getByRole("alert")).toContainText("Build zmienił się od analizy");
    expect((await draft(page)).requestData.slots.helmet.drifIds).toEqual([60]);
    await section(page, "Build i blokady").tap();
    await page.getByRole("button", { name: "Odblokuj slot" }).tap();
    await section(page, "Porady").tap();
    await page.getByRole("button", { name: "Zastosuj wybrany wariant" }).tap();
    await expect
        .poll(async () => (await draft(page)).requestData.slots.boots.drifIds)
        .toEqual([60]);
    await expect(page.getByRole("alert")).toHaveCount(0);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
        path: "../tmp/mobile-ui-audit/optimizer-advisor-320.png",
        fullPage: true,
    });
});
