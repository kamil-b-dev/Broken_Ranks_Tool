import { expect, test } from "@playwright/test";
import { builderCatalog } from "../src/test/fixtures/equipment/builderCatalog.js";

for (const layout of ["desktop", "mobile"]) {
    test(`${layout} shares profession across backpack, optimizer and planner`, async ({
        page,
    }, testInfo) => {
        await page.setViewportSize(
            layout === "mobile" ? { width: 320, height: 740 } : { width: 1440, height: 960 }
        );
        await page.addInitScript(() => {
            if (!localStorage.getItem("broken-ranks-tool.equipment-draft.v4"))
                localStorage.setItem(
                    "broken-ranks-tool.equipment-draft.v3",
                    JSON.stringify({
                        version: 3,
                        value: {
                            requestData: {
                                slots: {
                                    helmet: {
                                        itemId: 1,
                                        itemStars: 1,
                                        drifIds: [],
                                        drifLevels: {},
                                        orbIds: [],
                                        orbLevels: [],
                                    },
                                },
                                characterStats: {},
                            },
                            characterConfig: null,
                            backpack: [],
                            lockedSlots: [],
                            lockedDrifs: {},
                        },
                    })
                );
            if (!localStorage.getItem("broken-ranks-tool.optimizer-draft.v1"))
                localStorage.setItem(
                    "broken-ranks-tool.optimizer-draft.v1",
                    JSON.stringify({
                        version: 1,
                        value: {
                            format: "broken-ranks-tool-optimizer-config",
                            version: 1,
                            priorities: [],
                            settings: {
                                mode: "BUILD_FROM_SCRATCH",
                                configurationMode: "SIMPLE",
                                simpleProfile: "BARBARIAN",
                            },
                        },
                    })
                );
        });
        await page.route("**/api/initial-data", (route) => route.fulfill({ json: builderCatalog }));
        await page.route("**/api/calculator/calculate", (route) =>
            route.fulfill({ json: { stats: {} } })
        );
        let request;
        await page.route("**/api/optimizer/drifs", (route) => {
            request = route.request().postDataJSON();
            return route.fulfill({ status: 400, json: { message: "Test profilu profesji." } });
        });
        await page.goto(`/builder?ui=${layout}`);
        const profession = () => page.getByRole("combobox", { name: "Profesja", exact: true });
        await expect(profession()).toBeVisible();
        await profession().selectOption("FIRE_MAGE");
        await page
            .getByRole("group", { name: "Widok ekwipunku" })
            .or(page.getByRole("navigation", { name: "Sekcje kreatora" }))
            .getByRole("button", { name: "Plecak", exact: true })
            .click();
        await expect(profession()).toHaveValue("FIRE_MAGE");
        await profession().focus();
        await page
            .locator(".equipment-profession-control")
            .screenshot({ path: testInfo.outputPath("profession-control.png"), scale: "css" });
        expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
        ).toBe(true);
        await page.getByRole("link", { name: /Optymalizator/ }).click();
        await expect(page.getByLabel("Profil prostego optymalizatora")).toHaveValue("FIRE_MAGE");
        await page.getByRole("button", { name: /Uruchom optymalizację/i }).click();
        await expect.poll(() => request?.simpleProfile).toBe("FIRE_MAGE");
        await page.getByLabel("Profil prostego optymalizatora").selectOption("DRUID");
        await page.getByRole("link", { name: /Ścieżka rozwoju/ }).click();
        await expect(profession()).toHaveValue("DRUID");
        await profession().selectOption("ARCHER");
        await page.getByRole("link", { name: /Kreator/ }).click();
        await expect(profession()).toHaveValue("ARCHER");
        await page.reload();
        await expect(profession()).toHaveValue("ARCHER");
        await page.getByRole("link", { name: /Optymalizator/ }).click();
        await expect(page.getByLabel("Profil prostego optymalizatora")).toHaveValue("ARCHER");
    });
}
