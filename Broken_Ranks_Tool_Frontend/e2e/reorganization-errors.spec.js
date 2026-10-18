import { expect, test } from "@playwright/test";
import { builderCatalog } from "../src/test/fixtures/equipment/builderCatalog.js";

for (const layout of ["desktop", "mobile"]) {
    test(`${layout} reports a rate-limited reorganization without empty result sections or inventory changes`, async ({
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
        await page.getByRole("button", { name: /Uruchom optymalizację/i }).click();
        if (layout === "mobile") await page.getByRole("button", { name: "Pokaż wynik →" }).click();
        await expect(
            page.getByText("Przekroczono limit żądań. Spróbuj ponownie za 37 s.")
        ).toBeVisible();
        await expect(
            page.getByText("Ekwipunek nie został zmieniony.", { exact: true })
        ).toBeVisible();
        for (const title of ["Realizacja celów", "Warianty", "Najważniejsze zmiany"]) {
            await expect(page.getByText(title, { exact: true })).toHaveCount(0);
        }
        const saved = await page.evaluate(
            () => JSON.parse(localStorage.getItem("broken-ranks-tool.equipment-draft.v3")).value
        );
        expect(saved.requestData).toEqual(equipment.requestData);
        expect(saved.backpack).toEqual([]);
        expect(calls).toBe(1);
        await page.screenshot({
            path: `../tmp/reorganization-rate-limit-${layout}.png`,
            fullPage: true,
        });
    });
}
