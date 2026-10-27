import { expect } from "@playwright/test";

export async function captureOptimizer({ page, catalog, capture, importBuild, fixture }) {
    await importBuild(await fixture("archer-endgame-build.json"));
    await page.goto("/optimizer?ui=desktop");
    await capture("optimizer-modes", page.locator(".optimizer-mode-navigation"), {
        viewportWidth: 1100,
    });
    await page.getByRole("button", { name: "Prosty", exact: true }).click();
    await capture("simple-profile", page.locator(".simple-profile-panel"), {
        lastContent: ".simple-profile-toggle",
    });
    await page.getByRole("button", { name: "Zaawansowany", exact: true }).click();
    const clear = page
        .locator(".optimizer-priority-toolbar")
        .getByRole("button", { name: "Wyczyść", exact: true });
    if (await clear.count()) await clear.click();
    const critName = catalog.gameRules.bonusTranslations.CRITICAL_CHANCE;
    for (const bonus of ["CRITICAL_CHANCE", "DAMAGE_MAGIC"]) {
        await page
            .locator(".optimizer-bonus-card")
            .filter({ hasText: catalog.gameRules.bonusTranslations[bonus] })
            .click();
    }
    const card = page.locator(".optimizer-priority-card").first();
    if (
        (await card.locator(".optimizer-priority-summary").getAttribute("aria-expanded")) !== "true"
    )
        await card.locator(".optimizer-priority-summary").click();
    await capture("priorities", card);
    await card.locator(".optimizer-priority-sizes summary").click();
    await card
        .getByRole("checkbox", { name: `Ogranicz SUBDRIF dla ${critName}`, exact: true })
        .check();
    await capture("drif-limits", card);
    await card
        .getByRole("checkbox", { name: `Ogranicz SUBDRIF dla ${critName}`, exact: true })
        .uncheck();
    await card.getByRole("button", { name: /Maksymalizuj wartość moda/ }).click();
    await capture("maximization", card);
    await card.getByRole("button", { name: /Maksymalizuj wartość moda/ }).click();
    await capture("optimizer-config", page.locator(".optimizer-priority-toolbar"));
    await page.getByRole("checkbox", { name: "Obliczaj dodatkowe warianty", exact: true }).check();
    await capture("optimizer-settings", page.locator(".optimizer-settings-strip"), {
        viewportWidth: 1100,
    });
    await page.locator(".optimizer-lock-card").first().locator(".optimizer-lock-button").click();
    await capture("locks", page.locator(".optimizer-lock-column"), { maxHeight: 520 });
    await page.locator(".optimizer-lock-card").first().locator(".optimizer-lock-button").click();
    const run = async () => {
        const response = page.waitForResponse(
            (http) =>
                http.url().endsWith("/api/optimizer/drifs") && http.request().method() === "POST",
            { timeout: 45000 }
        );
        await page.locator(".optimizer-run-action").click();
        const result = await response;
        expect(result.ok()).toBeTruthy();
        const payload = await result.json();
        expect(payload.optimizedSetup).toBeTruthy();
        await expect(page.locator(".optimizer-status-message")).toBeVisible({ timeout: 15000 });
        return payload;
    };
    await run();
    await capture("optimizer-result", page.locator(".optimizer-report-scroll"), { maxHeight: 730 });
    await capture("variants", page.locator(".optimizer-variants-section"));

    // A small legal build leaves room for visible, reproducible improvements.
    const itemFor = (category) =>
        catalog.items.find(
            (item) =>
                item.category === category &&
                item.rarity === "RARE" &&
                ["X", "XI", "XII"].includes(item.tier) &&
                item.capacity >= 12
        );
    const drif = catalog.drifs.find(
        (stone) => stone.bonusType === "CRITICAL_CHANCE" && stone.size === "SUBDRIF"
    );
    const slot = (itemId, withDrif) => ({
        itemId,
        itemStars: 1,
        drifIds: withDrif ? [drif.id] : [],
        drifLevels: withDrif ? { 0: 2 } : {},
        orbIds: [],
        orbLevels: [],
    });
    const payload = {
        format: "broken-ranks-tool-build",
        version: 3,
        build: {
            requestData: {
                slots: {
                    helmet: slot(itemFor("HELMET").id, true),
                    armor: slot(itemFor("ARMOR").id, false),
                },
                characterStats: {},
            },
            characterConfig: null,
            lockedSlots: [],
            lockedDrifs: {},
            backpack: [
                {
                    id: "example-drif",
                    kind: "DRIF",
                    templateId: drif.id,
                    level: 6,
                    selectedForOptimization: true,
                },
            ],
        },
    };
    await importBuild(payload);
    await page.goto("/optimizer?ui=desktop");
    await page.getByRole("button", { name: "Doradca", exact: true }).click();
    await page.locator("#advisor-main-goal").selectOption("CRITICAL_CHANCE");
    await page.locator("#advisor-target-mode").selectOption("VALUE");
    await capture("advisor", page.locator(".advisor-goal-card").first());
    await capture(
        "advisor-protections",
        page.locator(".advisor-goal-card").filter({ has: page.locator(".advisor-modifier-list") }),
        { maxHeight: 560 }
    );
    await capture(
        "advisor-changes",
        page.locator(".advisor-goal-card").filter({ has: page.locator(".advisor-change-options") })
    );
    await capture("advisor-search", page.locator(".advisor-search-limits"));
    await page.locator("#advisor-target-mode").selectOption("MAXIMIZE");
    await page.getByRole("checkbox", { name: "Gwiazdki", exact: true }).check();
    await page.getByRole("checkbox", { name: "Ulepszanie drifów", exact: true }).check();
    await page.getByRole("checkbox", { name: "Zakupy drifów", exact: true }).uncheck();
    await page.getByRole("checkbox", { name: "Zakupy przedmiotów", exact: true }).uncheck();
    await run();
    await capture("advisor-result", page.locator(".optimizer-report-scroll"), { maxHeight: 850 });

    await importBuild(payload);
    await page.goto("/optimizer?ui=desktop");
    await page.getByRole("button", { name: "Od zera", exact: true }).click();
    await page.getByRole("button", { name: "Zaawansowany", exact: true }).click();
    await page.getByRole("checkbox", { name: "Użyj drifów z plecaka", exact: true }).check();
    await capture("backpack-drifs", page.locator(".optimizer-settings-strip"), {
        viewportWidth: 1100,
    });
    await page.getByRole("button", { name: "Reorganizacja", exact: true }).click();
    await capture("reorganization", page.locator(".reorganization-tasks"));
    await page.getByRole("button", { name: "Ulepsz drify", exact: true }).click();
    const source = page.getByRole("combobox", { name: "Kamień do ulepszenia", exact: true });
    await source.selectOption({ index: 1 });
    await page
        .getByRole("combobox", { name: "Docelowy kamień", exact: true })
        .selectOption(String(drif.id));
    await page.getByRole("spinbutton", { name: "Docelowy poziom", exact: true }).fill("6");
    await capture("reorganization-upgrade", page.locator(".reorganization-upgrades"));
    await page.getByRole("button", { name: "Zwolnij miejsce", exact: true }).click();
    await page.getByRole("combobox", { name: "Przedmiot", exact: true }).selectOption("helmet");
    await page.getByLabel("Wymagane wolne gniazda", { exact: true }).fill("3");
    await page.getByText("Ustawienia zaawansowane", { exact: true }).click();
    await page
        .getByLabel(/Dopuszczalny spadek dla:/)
        .first()
        .fill("100");
    await capture("reorganization-reserve", page.locator(".reorganization-goals"), {
        maxHeight: 750,
    });
    await run();
    await capture("reorganization-report", page.locator(".optimizer-report-scroll"), {
        maxHeight: 800,
    });
}
