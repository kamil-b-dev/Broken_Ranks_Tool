import { expect } from "@playwright/test";

export async function captureBuilder({ page, capture, importBuild, fixture }) {
    await importBuild(await fixture("archer-endgame-build.json"));
    await capture("equipment", page.locator(".gear-slot-editor"));
    await capture("capacity", page.locator(".gear-slot-drif-section"));
    await page.getByRole("spinbutton", { name: "Poziom postaci", exact: true }).fill("140");
    await page.getByRole("spinbutton", { name: "Poziom postaci", exact: true }).press("Enter");
    await page.locator('[data-stat="Siła"] button').last().click();
    await capture("character", page.locator(".character-summary"), { viewportWidth: 1100 });
    await capture("history", page.locator(".equipment-history-actions"));
    await capture("stone-levels", page.locator(".equipment-level-actions"), { maxWidth: 420 });
    await capture("equipment-removal", page.locator(".equipment-removal-actions"), {
        maxWidth: 850,
    });
    await capture("build-files", page.locator(".header-actions"));
    await capture("labels", page.locator(".optimizer-label-setting"));

    await page.getByRole("button", { name: "Przelicz statystyki", exact: true }).click();
    await expect(page.locator(".stat-explain-trigger").first()).toBeVisible();
    await page
        .locator(".stat-explain-trigger")
        .filter({ hasText: /magicz/i })
        .first()
        .click();
    await expect(page.locator(".stat-explanation-body")).toHaveAttribute("aria-busy", "false");
    await capture("stats", page.locator(".stat-explanation"));
    await page.getByRole("button", { name: "Wróć do statystyk", exact: true }).click();

    await page
        .locator(
            ".gear-slot-drif-section .equipment-removal-action > button:first-child:not(:disabled)"
        )
        .first()
        .click();
    await page.getByRole("button", { name: "Plecak", exact: true }).last().click();
    await capture("backpack", page.locator(".backpack-workbench"), {
        lastContent: ".backpack-card",
    });
    await page.locator(".backpack-card > button").first().click();
    await capture(
        "backpack-editor",
        page.locator(".backpack-editor .selected-slot-editor-content"),
        { lastContent: "select" }
    );
    await page.locator(".builder-resource-switch button").last().click();
    await capture("backpack-source", page.locator(".backpack-source-panel"), {
        lastContent: ".backpack-source-card",
    });
    await page.locator(".builder-resource-switch button").first().click();
    await page.locator('.builder-database-column input[type="text"]').first().fill("Morana|Tarul");
    await capture("database", page.locator(".builder-resource-panel"), { maxHeight: 670 });

    await importBuild(await fixture("progression-epic-target.json"));
    await page.goto("/builder?ui=desktop&slot=weapon");
    await page.locator(".equipment-ring-slot-weapon").click();
    await expect(page.getByLabel(/^Poziom wbudowanego drifu/).first()).toBeVisible();
    await capture("built-in-drifs", page.locator(".gear-slot-drif-section"));
}
