import { expect, test } from "@playwright/test";
import { mobileDevice } from "./mobile-device";
import AxeBuilder from "@axe-core/playwright";
import { Buffer } from "node:buffer";
import { SLOTS } from "../src/shared/domain/equipment/equipmentSlots.js";

import { builderCatalog as catalog } from "../src/test/fixtures/equipment/builderCatalog.js";

const mockCatalog = async (page) => {
    await page.route("**/api/initial-data", (route) => route.fulfill({ json: catalog }));
    await page.route("**/api/calculator/calculate", (route) =>
        route.fulfill({
            json: {
                stats: { Siła: 15, CRITICAL_CHANCE: "12%", DEFENSE: "5%" },
                drifCategories: { CRITICAL_CHANCE: "OFFENSIVE" },
                orbBonusTypes: ["DEFENSE"],
            },
        })
    );
};

const equip = async (page, label) => {
    await page.getByRole("button", { name: `Edytuj slot: ${label}`, exact: true }).tap();
    await page.getByRole("button", { name: "Wybierz przedmiot", exact: true }).tap();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: `${label} podróżnika`, exact: false }).tap();
    await page
        .getByRole("dialog")
        .getByRole("button", { name: "Wybierz przedmiot", exact: true })
        .tap();
    await expect(page.getByRole("dialog")).toHaveCount(0);
};

test.describe("dedicated mobile builder", () => {
    test.use(mobileDevice);
    test.setTimeout(60000);

    test("keeps a large item picker bounded and loads other workspaces on demand", async ({
        page,
    }) => {
        const requestedScripts = [];
        page.on("request", (request) => {
            if (request.resourceType() === "script") requestedScripts.push(request.url());
        });
        const largeCatalog = {
            ...catalog,
            items: Array.from({ length: 1500 }, (_, index) => ({
                ...catalog.items[0],
                id: index + 100,
                name: `Hełm testowy ${String(index).padStart(4, "0")}`,
            })),
        };
        await page.route("**/api/initial-data", (route) => route.fulfill({ json: largeCatalog }));
        await page.goto("/kreator");
        await page.getByRole("button", { name: "Edytuj slot: Hełm", exact: true }).tap();
        await page.getByRole("button", { name: "Wybierz przedmiot", exact: true }).tap();
        await expect(page.locator(".mobile-picker-results button")).toHaveCount(40);
        await expect(page.getByText("1500 przedmiotów", { exact: true })).toBeVisible();
        const scan = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
        expect(scan.violations).toEqual([]);
        await page.setViewportSize({ width: 320, height: 740 });
        await expect(page.locator("html")).toHaveJSProperty("scrollWidth", 320);
        await page.screenshot({ path: "../tmp/mobile-performance/pagination-320.png" });
        await page.getByRole("button", { name: "Następna", exact: true }).tap();
        await expect(page.locator(".mobile-picker-results button")).toHaveCount(40);
        await expect(page.locator(".mobile-picker-results button").first()).toContainText("0040");
        await page.getByRole("searchbox").fill("1499");
        await expect(page.locator(".mobile-picker-results button")).toHaveCount(1);
        await page.getByRole("button", { name: /Hełm testowy 1499/ }).tap();
        await page
            .getByRole("dialog")
            .getByRole("button", { name: "Wybierz przedmiot", exact: true })
            .tap();
        await expect(page.getByRole("heading", { name: "Hełm testowy 1499" })).toBeVisible();
        expect(
            requestedScripts.some((url) =>
                /DesktopApp|MobileOptimizerWorkspace|BuildLibraryWorkspace/.test(url)
            )
        ).toBe(false);
        await page.getByRole("link", { name: "Optymalizator", exact: true }).tap();
        await expect(page.locator(".mobile-optimizer")).toBeVisible();
        expect(requestedScripts.some((url) => url.includes("MobileOptimizerWorkspace"))).toBe(true);
        await page.getByRole("link", { name: "Buildy", exact: true }).tap();
        await expect(page.getByRole("heading", { name: "Buildy lokalne" })).toBeVisible();
        expect(requestedScripts.some((url) => url.includes("BuildLibraryWorkspace"))).toBe(true);
        expect(requestedScripts.some((url) => url.includes("DesktopApp"))).toBe(false);
    });

    test("edits every slot by touch and preserves equipment through history, rotation and reload", async ({
        page,
    }) => {
        await mockCatalog(page);
        await page.goto("/kreator");
        await expect(page.locator(".mobile-app")).toBeVisible();
        await expect(page.locator(".app-masthead")).toHaveCount(0);
        await expect(page.locator(".mobile-slot-card")).toHaveCount(12);
        for (const slot of SLOTS) {
            // Rings share a category, so choose the matching named item explicitly.
            await equip(page, slot.label);
            await page.getByLabel("Gwiazdki", { exact: true }).selectOption("9");
            await page.getByRole("button", { name: "Wszystkie sloty", exact: false }).tap();
            await expect(page.locator(`#mobile-slot-${slot.key}`)).toContainText(
                `${slot.label} podróżnika`
            );
        }
        await page.getByRole("button", { name: "Edytuj slot: Hełm", exact: true }).tap();
        await expect(page.getByLabel("Gwiazdki", { exact: true })).toHaveValue("9");
        await page.getByLabel("Wybierz rodzaj drifa 1", { exact: true }).selectOption("Band");
        await page.getByLabel("Wybierz wielkość drifa 1", { exact: true }).selectOption("60");
        await page.getByLabel("Wybierz poziom drifa 1", { exact: true }).selectOption("6");
        await page.getByLabel("Wybierz rodzaj orba").selectOption("Ochrona");
        await page.getByLabel("Wybierz wielkość orba").selectOption("50");
        await page.setViewportSize({ width: 844, height: 390 });
        await expect(page.getByLabel("Wybierz poziom drifa 1", { exact: true })).toHaveValue("6");
        await page.setViewportSize({ width: 320, height: 740 });
        await expect(page.locator("html")).toHaveJSProperty("scrollWidth", 320);
        await page.screenshot({
            path: "../tmp/mobile-ui-audit/mobile-slot-320.png",
            fullPage: true,
        });
        await page.reload();
        await expect(page.getByLabel("Wybierz poziom drifa 1", { exact: true })).toHaveValue("6");
        await expect(page.getByLabel("Wybierz wielkość orba")).toHaveValue("50");
        await page.getByRole("button", { name: "Zmień przedmiot" }).tap();
        await page.goBack();
        await expect(page.getByRole("dialog")).toHaveCount(0);
        await expect(page.getByLabel("Gwiazdki", { exact: true })).toHaveValue("9");
        await page.getByRole("button", { name: "Wszystkie sloty", exact: false }).tap();
        await expect(page.locator(".mobile-count")).toHaveText("12 / 12");
        await page.screenshot({
            path: "../tmp/mobile-ui-audit/mobile-build-320.png",
            fullPage: true,
        });
        await page.getByRole("button", { name: "Statystyki", exact: true }).tap();
        await page.getByRole("button", { name: "Przelicz statystyki" }).tap();
        await expect(page.getByRole("definition").filter({ hasText: "12%" })).toBeVisible();
        const statsPanel = page.getByRole("tabpanel");
        await expect(statsPanel.locator(".mobile-card")).toHaveCount(3);
        await page.getByRole("tab", { name: "Bazowe" }).tap();
        await expect(statsPanel.locator(".mobile-card")).toHaveCount(1);
        await expect(statsPanel).toContainText("Siła");
        await expect(statsPanel).not.toContainText("Szansa na krytyk");
        await page.getByRole("tab", { name: "Orby" }).tap();
        await expect(statsPanel.locator(".mobile-card")).toHaveCount(1);
        await expect(statsPanel).toContainText("DEFENSE");
        await page.getByRole("tab", { name: "Drify" }).tap();
        await expect(statsPanel.locator(".mobile-card")).toHaveCount(1);
        await expect(statsPanel).toContainText("Szansa na krytyk");
        await page.getByRole("tab", { name: "Wszystkie" }).tap();
        await expect(statsPanel.locator(".mobile-card")).toHaveCount(3);
        await page.locator(".mobile-build-actions summary").tap();
        await page.getByRole("button", { name: "Zapisz lokalnie", exact: false }).tap();
        await expect(page.getByRole("status")).toContainText("Zapisano lokalnie");
        const saved = await page.evaluate(() =>
            JSON.parse(localStorage.getItem("broken-ranks-tool.build-library.v1"))
        );
        expect(saved.builds).toHaveLength(1);
        await expect(page.locator(".mobile-build-actions")).not.toHaveAttribute("open");
        const scan = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
            .analyze();
        expect(scan.violations).toEqual([]);
    });

    test("allows searching, cancelling and restoring focus without changing the slot", async ({
        page,
    }) => {
        await mockCatalog(page);
        await page.goto("/kreator");
        await page.getByRole("button", { name: "Edytuj slot: Hełm", exact: true }).tap();
        await page.getByRole("button", { name: "Wybierz przedmiot", exact: true }).tap();
        await page.getByRole("searchbox", { name: "Szukaj przedmiotu" }).fill("nieistniejący");
        await expect(page.getByText("Brak pasujących przedmiotów.")).toBeVisible();
        await page.getByRole("searchbox").fill("podróżnika");
        await expect(page.getByRole("button", { name: /Hełm podróżnika/ })).toBeVisible();
        const scan = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
        expect(scan.violations).toEqual([]);
        await page.keyboard.press("Escape");
        await expect(page.getByRole("dialog")).toHaveCount(0);
        await expect(
            page.getByRole("button", { name: "Wybierz przedmiot", exact: true })
        ).toBeFocused();
        await expect(page.locator(".mobile-count")).toHaveText("0 / 12");
        await page.getByRole("button", { name: "Wszystkie sloty", exact: false }).tap();
        await expect(
            page.getByRole("button", { name: "Edytuj slot: Hełm", exact: true })
        ).toBeFocused();
    });

    test("audits the visible mobile builder actions by their effects", async ({ page }) => {
        await mockCatalog(page);
        await page.goto("/kreator");

        await page.getByRole("button", { name: "Edytuj slot: Hełm", exact: true }).tap();
        await page.getByRole("button", { name: "Wybierz przedmiot", exact: true }).tap();
        await page.getByRole("button", { name: /Hełm podróżnika/ }).tap();
        await page
            .getByRole("dialog")
            .getByRole("button", { name: "Wybierz przedmiot", exact: true })
            .tap();
        await expect(page.getByRole("dialog")).toHaveCount(0);
        await page.getByLabel("Gwiazdki", { exact: true }).selectOption("9");
        await page.getByLabel("Wybierz rodzaj drifa 1", { exact: true }).selectOption("Band");
        await page.getByLabel("Wybierz wielkość drifa 1", { exact: true }).selectOption("60");
        await page.getByLabel("Wybierz poziom drifa 1", { exact: true }).selectOption("1");
        await page.getByLabel("Wybierz rodzaj orba").selectOption("Ochrona");
        await page.getByLabel("Wybierz wielkość orba").selectOption("50");
        await expect(page.getByLabel("Wybierz poziom orba")).toHaveValue("1");

        await page.getByRole("button", { name: "Wszystkie sloty", exact: false }).tap();
        await expect(page.locator(".mobile-bulk-actions summary")).toHaveCount(0);
        await expect(page.getByRole("button", { name: "Maksymalne poziomy drifów" })).toBeVisible();
        await expect(page.getByRole("button", { name: "Maksymalne poziomy orbów" })).toBeVisible();
        await page.getByRole("button", { name: "Maksymalne poziomy drifów" }).tap();
        await expect(page.locator(".mobile-count")).toHaveText("1 / 12");
        await page.getByRole("button", { name: "Edytuj slot: Hełm", exact: true }).tap();
        await expect(page.getByLabel("Wybierz poziom drifa 1", { exact: true })).toHaveValue("6");
        await page.getByRole("button", { name: "Wszystkie sloty", exact: false }).tap();
        await page.getByRole("button", { name: "Maksymalne poziomy orbów" }).tap();
        await page.getByRole("button", { name: "Edytuj slot: Hełm", exact: true }).tap();
        await expect(page.getByLabel("Wybierz poziom orba")).toHaveValue("1");

        await page.getByRole("button", { name: "Zmień przedmiot" }).tap();
        await page.getByRole("button", { name: /Hełm podróżnika/ }).tap();
        await expect(page.getByText("Pojemność", { exact: true })).toBeVisible();
        await page.getByRole("button", { name: "Wyniki wyszukiwania" }).tap();
        await expect(page.getByRole("searchbox", { name: "Szukaj przedmiotu" })).toBeVisible();
        await page.getByRole("button", { name: "Zamknij wybór przedmiotu" }).tap();
        await expect(page.getByRole("dialog")).toHaveCount(0);
        await expect(page.getByRole("button", { name: "Zmień przedmiot" })).toBeVisible();
        await page.getByRole("button", { name: "Usuń przedmiot ze slotu" }).tap();
        await expect(page.getByRole("button", { name: "Wybierz przedmiot" })).toBeVisible();
        await expect(page.locator(".mobile-count")).toHaveText("0 / 12");
        await page.getByRole("button", { name: "Wszystkie sloty", exact: false }).tap();

        await page.getByRole("button", { name: "Postać", exact: true }).tap();
        await page.getByLabel("Poziom postaci").fill("140");
        const strength = page.locator(".mobile-character-stat").filter({ hasText: "Siła" });
        await strength.getByRole("button", { name: "Dodaj punkt: Siła" }).tap();
        await expect(strength).toContainText("11 pkt");
        await strength.getByRole("button", { name: "Odejmij punkt: Siła" }).tap();
        await expect(strength).toContainText("0 pkt");
        await strength.getByRole("button", { name: "Dodaj punkt: Siła" }).tap();
        await page.getByRole("button", { name: "Zresetuj punkty" }).tap();
        await expect(strength).toContainText("0 pkt");
        await page.getByRole("button", { name: "Statystyki", exact: true }).tap();
        await page.getByRole("button", { name: "Przelicz statystyki" }).tap();
        await expect(page.getByRole("definition").filter({ hasText: "12%" })).toBeVisible();
    });

    test("keeps mobile navigation and the focused field reachable", async ({ page }) => {
        await mockCatalog(page);
        await page.goto("/kreator");
        await page.locator(".mobile-build-actions summary").tap();
        await page.getByRole("button", { name: /Zapisz lokalnie/ }).tap();
        await expect(page.getByRole("status")).toContainText("Zapisano lokalnie");

        await page.getByRole("link", { name: "Start", exact: true }).tap();
        await expect(page.getByRole("heading", { name: "Broken Ranks Tool" })).toBeVisible();
        await expect(page.locator(".mobile-app")).toHaveCSS(
            "background-image",
            /home-hero-abstract/
        );
        await page.setViewportSize({ width: 390, height: 844 });
        await page.screenshot({
            path: "../tmp/mobile-ui-audit/mobile-home-390.png",
            fullPage: true,
        });
        await page.getByRole("link", { name: "Buildy", exact: true }).tap();
        await expect(page.getByRole("heading", { name: "Buildy lokalne" })).toBeVisible();

        await page.getByRole("link", { name: "Optymalizator", exact: true }).tap();
        await expect(page.locator(".mobile-optimizer")).toBeVisible();
        await expect(
            page.getByRole("link", { name: "Optymalizator", exact: true })
        ).toHaveAttribute("aria-current", "page");

        await page.getByRole("link", { name: "Buildy", exact: true }).tap();
        await expect(page.getByRole("heading", { name: "Buildy lokalne" })).toBeVisible();
        await expect(page.getByRole("article").getByText("Build 1")).toBeVisible();
        await page.getByRole("button", { name: "Wczytaj", exact: true }).tap();
        await expect(page.locator(".mobile-slot-card")).toHaveCount(12);
        await expect(page.locator(".mobile-count")).toHaveText("0 / 12");

        await page.getByRole("button", { name: "Postać", exact: true }).tap();
        await page.setViewportSize({ width: 390, height: 480 });
        await page.getByLabel("Poziom postaci").focus();
        await expect(page.locator(".mobile-navigation")).toHaveCSS("position", "static");
        await page.getByLabel("Poziom postaci").blur();
        await expect(page.locator(".mobile-navigation")).toHaveCSS("position", "fixed");
        await expect(page.locator("html")).toHaveJSProperty("scrollWidth", 390);
    });

    test("imports into the active editor and keeps character points when navigating", async ({
        page,
    }) => {
        await mockCatalog(page);
        await page.goto("/kreator?slot=helmet");
        const payload = {
            format: "broken-ranks-tool-build",
            version: 1,
            build: {
                requestData: {
                    slots: {
                        helmet: { itemId: 1, itemStars: 7, drifIds: [60], drifLevels: { 0: 6 } },
                    },
                    characterStats: {},
                },
            },
        };
        await page.locator(".mobile-build-actions summary").tap();
        const choosing = page.waitForEvent("filechooser");
        await page.getByRole("button", { name: "Wczytaj plik buildu" }).tap();
        await (
            await choosing
        ).setFiles({
            name: "mobilny.json",
            mimeType: "application/json",
            buffer: Buffer.from(JSON.stringify(payload)),
        });
        await expect(page.getByLabel("Gwiazdki")).toHaveValue("7");
        await expect(page.getByLabel("Wybierz poziom drifa 1", { exact: true })).toHaveValue("6");
        await page.getByRole("link", { name: "Kreator", exact: true }).tap();
        await expect(page.locator(".mobile-slot-card")).toHaveCount(12);
        await page.getByRole("button", { name: "Postać", exact: true }).tap();
        await page.getByLabel("Poziom postaci").fill("140");
        await page.getByRole("button", { name: "Dodaj punkt: Siła", exact: true }).tap();
        await page.getByRole("button", { name: "Ekwipunek", exact: true }).tap();
        await page.getByRole("button", { name: "Postać", exact: true }).tap();
        await expect(page.getByLabel("Poziom postaci")).toHaveValue("140");
        await expect(
            page.locator(".mobile-character-stat").filter({ hasText: "Siła" })
        ).toContainText("11");
        await page.reload();
        await expect(page.getByLabel("Poziom postaci")).toHaveValue("140");
        for (const width of [320, 360, 390, 430, 768, 1024]) {
            await page.setViewportSize({ width, height: 844 });
            await expect(page.locator("html")).toHaveJSProperty("scrollWidth", width);
            const links = await page.locator(".mobile-navigation a").evaluateAll((elements) =>
                elements.map((element) => ({
                    width: element.clientWidth,
                    content: element.scrollWidth,
                }))
            );
            expect(links.every(({ width, content }) => content <= width)).toBe(true);
        }
    });
});

test("narrow touch desktop retains its current UI and supports an explicit preview", async ({
    browser,
}) => {
    const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        hasTouch: true,
    });
    const page = await context.newPage();
    await mockCatalog(page);
    await page.goto("/kreator");
    await expect(page.locator(".app-masthead")).toBeVisible();
    await expect(page.locator(".mobile-app")).toHaveCount(0);
    await page.goto("/kreator?ui=mobile");
    await expect(page.locator(".mobile-app")).toBeVisible();
    await page.getByRole("link", { name: "Start", exact: true }).tap();
    await page.reload();
    await expect(page.locator(".mobile-app")).toBeVisible();
    await page.goto("/kreator?ui=desktop");
    await expect(page.locator(".app-masthead")).toBeVisible();
    await context.close();
});
