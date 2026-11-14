import { expect, test } from "@playwright/test";
import { builderCatalog } from "../src/test/fixtures/equipment/builderCatalog.js";

for (const layout of ["desktop", "mobile"]) {
    test(`${layout} counts down a rate-limited reorganization without automatic retries or inventory changes`, async ({
        page,
    }) => {
        await page.setViewportSize(
            layout === "desktop" ? { width: 1500, height: 950 } : { width: 390, height: 844 }
        );
        const equipment = {
            requestData: {
                slots: {
                    helmet: {
                        itemId: 1,
                        itemStars: 1,
                        drifIds: [60],
                        drifLevels: { 0: 2 },
                        orbIds: [],
                        orbLevels: [],
                    },
                },
                characterStats: {},
            },
            lockedSlots: [],
            lockedDrifs: {},
            backpack: [],
            characterConfig: null,
        };
        await page.addInitScript(
            ({ equipment }) => {
                localStorage.setItem(
                    "broken-ranks-tool.equipment-draft.v3",
                    JSON.stringify({ version: 3, value: equipment })
                );
                localStorage.setItem(
                    "broken-ranks-tool.optimizer-draft.v1",
                    JSON.stringify({
                        version: 1,
                        value: {
                            format: "broken-ranks-tool-optimizer-config",
                            version: 1,
                            priorities: [],
                            settings: {
                                mode: "REORGANIZE",
                                reorganization: {
                                    task: "UPGRADE",
                                    source: "helmet:0",
                                    targetTemplateId: 60,
                                    targetLevel: 6,
                                },
                            },
                        },
                    })
                );
            },
            { equipment }
        );
        await page.route("**/api/initial-data", (route) => route.fulfill({ json: builderCatalog }));
        await page.route("**/api/calculator/calculate", (route) =>
            route.fulfill({ json: { stats: {} } })
        );
        let calls = 0;
        await page.route("**/api/optimizer/drifs", (route) => {
            calls++;
            return route.fulfill({
                status: 429,
                headers: { "Retry-After": "37" },
                json: { message: "Przekroczono limit żądań. Spróbuj ponownie później." },
            });
        });
        await page.goto(`/optimizer?ui=${layout}`);
        await expect(page.getByLabel("Docelowy poziom")).toHaveValue("6");
        await page.clock.install({ time: new Date("2026-11-14T12:00:00Z") });
        await page.clock.pauseAt(new Date("2026-11-14T12:00:01Z"));
        const runButton = page.getByRole("button", {
            name: /Uruchom optymalizację|optymalizuj ponownie/i,
        });
        await runButton.click();
        if (layout === "mobile") await page.getByRole("button", { name: "Pokaż wynik →" }).click();
        await expect(
            page.getByText("Przekroczono limit żądań. Spróbuj ponownie później.")
        ).toBeVisible();
        await expect(runButton).toBeDisabled();
        await expect(page.getByRole("timer")).toHaveText("Ponowne uruchomienie za 37 s.");
        await expect(runButton).toHaveAccessibleDescription("Ponowne uruchomienie za 37 s.");
        await page.clock.fastForward(1000);
        await expect(page.getByRole("timer")).toHaveText("Ponowne uruchomienie za 36 s.");
        await expect(
            page.getByText("Ekwipunek nie został zmieniony.", { exact: true })
        ).toBeVisible();
        for (const title of ["Realizacja celów", "Warianty", "Najważniejsze zmiany"]) {
            await expect(page.getByText(title, { exact: true })).toHaveCount(0);
        }
        const saved = await page.evaluate(
            () =>
                JSON.parse(
                    localStorage.getItem("broken-ranks-tool.equipment-draft.v4") ||
                        localStorage.getItem("broken-ranks-tool.equipment-draft.v3")
                ).value
        );
        expect(saved.requestData).toEqual(equipment.requestData);
        expect(saved.backpack).toEqual([]);
        expect(calls).toBe(1);
        await page.screenshot({
            path: `../tmp/reorganization-rate-limit-${layout}.png`,
            fullPage: true,
        });
        await page.getByRole("link", { name: /Ścieżka rozwoju/, exact: false }).click();
        await expect(
            page.getByRole("heading", { name: "Ścieżka rozwoju", exact: true })
        ).toBeVisible();
        await expect(page.getByRole("timer")).toHaveText("Ponowne uruchomienie za 36 s.");
        await page.getByLabel("Docelowy build").selectOption("current");
        const planButton = page.getByRole("button", { name: "Zaplanuj ścieżkę", exact: true });
        await expect(planButton).toBeDisabled();
        await page.clock.fastForward(36000);
        await expect(planButton).toBeEnabled();
        await expect(page.getByRole("timer")).toHaveCount(0);
        await page.getByRole("link", { name: /Optymalizator/, exact: false }).click();
        await expect(runButton).toBeEnabled();
        expect(calls).toBe(1);
    });
}
