import { expect } from "@playwright/test";

export async function captureLibraryAndProgression({ page, capture, importBuild, fixture }) {
    await importBuild(await fixture("archer-endgame-build.json"));
    await page.getByRole("button", { name: "Przelicz statystyki", exact: true }).click();
    await expect(page.locator(".stat-explain-trigger").first()).toBeVisible();
    await page.getByRole("button", { name: "Zapisz lokalnie", exact: true }).click();
    await expect(page.getByText(/Zapisano lokalnie build/)).toBeVisible();
    await page
        .locator(
            ".gear-slot-drif-section .equipment-removal-action > button:first-child:not(:disabled)"
        )
        .first()
        .click();
    const calculated = page.waitForResponse(
        (http) =>
            http.url().endsWith("/api/calculator/calculate") && http.request().method() === "POST"
    );
    await page.getByRole("button", { name: "Przelicz statystyki", exact: true }).click();
    expect((await calculated).ok()).toBeTruthy();
    await page.getByRole("button", { name: "Zapisz lokalnie", exact: true }).click();
    await expect(page.getByText(/Zapisano lokalnie build „Build 2”/)).toBeVisible();
    await page.goto("/builds?ui=desktop");
    await expect(page.locator(".saved-build-card")).toHaveCount(2);
    await capture("library", page.locator(".build-library-list"), {
        lastContent: ".saved-build-card",
    });
    await page.locator(".saved-build-compare input").nth(0).check();
    await page.locator(".saved-build-compare input").nth(1).check();
    await capture("comparison", page.locator(".build-comparison-content"), {
        maxHeight: 340,
        viewportWidth: 1280,
    });
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Pobierz całą bibliotekę", exact: true }).click();
    const download = await downloadPromise;
    await page
        .getByLabel("Plik kopii biblioteki", { exact: true })
        .setInputFiles(await download.path());
    await expect(page.locator(".library-backup-preview")).toBeVisible();
    await capture("library-backup", page.locator(".library-backup"), { viewportWidth: 1100 });

    await importBuild(await fixture("progression-epic-target.json"));
    await page.goto("/progression-path?ui=desktop");
    await page
        .getByRole("combobox", { name: "Docelowy build", exact: true })
        .selectOption("current");
    await page.getByRole("combobox", { name: "Profesja", exact: true }).selectOption("FIRE_MAGE");
    await page.getByRole("checkbox", { name: /Pierścień 1/ }).check();
    await capture("progression-source", page.locator(".progression-source"), {
        viewportWidth: 1000,
    });
    await capture("progression-options", page.locator(".progression-controls"), {
        viewportWidth: 1000,
    });
    await capture("progression-files", page.locator(".progression-actions"));
    const response = page.waitForResponse(
        (http) =>
            http.url().endsWith("/api/progression-path/plan") && http.request().method() === "POST",
        { timeout: 45000 }
    );
    await page.locator(".progression-run").click();
    const result = await response;
    expect(result.ok()).toBeTruthy();
    expect((await result.json()).outcome).toBe("VALID_PATH");
    await expect(page.locator(".progression-timeline")).toBeVisible();
    const stage = page.locator('.progression-timeline > li[data-level="32"]');
    await stage.locator(".progression-stage-toggle").click();
    await capture("progression-stage", stage, { maxHeight: 900 });
    await page.locator(".progression-shopping > summary").click();
    await page.locator(".progression-shopping select").selectOption("next");
    await capture("progression-shopping", page.locator(".progression-shopping"), {
        maxHeight: 620,
    });
}
