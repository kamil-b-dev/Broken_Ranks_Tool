import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures/test.js";
import { mobileDevice } from "./mobile-device.js";
import { builderCatalog } from "../src/test/fixtures/equipment/builderCatalog.js";
import { createBuildPayload } from "../src/features/builds/buildPayload.js";
import { createLocalBuildRecord } from "../src/features/builds/buildLibraryStorage.js";

const payload = (stars = 1) =>
    createBuildPayload({
        requestData: {
            slots: {
                helmet: {
                    itemId: 1,
                    itemStars: stars,
                    orbIds: [],
                    orbLevels: [],
                    drifIds: [],
                    drifLevels: {},
                },
            },
            characterStats: {},
        },
        characterConfig: null,
        lockedSlots: [],
        lockedDrifs: {},
        backpack: [{ id: "owned", kind: "DRIF", templateId: "60", level: 6, sendToBackend: true }],
    });
const saved = createLocalBuildRecord({
    id: "saved-one",
    name: "Podstawowy",
    snapshot: { payload: payload(9) },
});
const report = {
    stages: [20, 140].map((level) => ({
        stage: {
            id: String(level),
            characterLevel: level,
            equipment: payload(level === 140 ? 3 : 1).build.requestData,
        },
        actions: [],
        orbActions: [],
        equipmentChanges: [],
        calculation: { stats: { Siła: 15 } },
    })),
    warnings: [],
    remainingDrifs: [],
    resSlots: [],
};

for (const mobile of [false, true]) {
    test.describe(mobile ? "mobile home backup progress" : "desktop home backup progress", () => {
        if (mobile) test.use(mobileDevice);
        test.beforeEach(async ({ page, browserName }) => {
            test.skip(!mobile && browserName === "webkit", "Desktop covered by Chromium.");
            await page.route("**/api/initial-data", (route) =>
                route.fulfill({ json: builderCatalog })
            );
            await page.route("**/api/calculator/calculate", (route) =>
                route.fulfill({ json: { stats: { Siła: 15 } } })
            );
            await page.route("**/api/progression-path/plan", (route) =>
                route.fulfill({ json: report })
            );
            await page.addInitScript(
                ({ saved, draft }) => {
                    const key = "broken-ranks-tool.build-library.v1";
                    if (!localStorage.getItem(key))
                        localStorage.setItem(key, JSON.stringify({ version: 1, builds: [saved] }));
                    const draftKey = "broken-ranks-tool.equipment-draft.v3";
                    if (!localStorage.getItem(draftKey))
                        localStorage.setItem(
                            draftKey,
                            JSON.stringify({ version: 3, value: draft })
                        );
                },
                { saved, draft: payload(3).build }
            );
        });

        const expectStars = async (page, stars) => {
            if (mobile) {
                await page.getByRole("button", { name: "Edytuj slot: Hełm", exact: true }).click();
                await expect(page.getByLabel("Gwiazdki", { exact: true })).toHaveValue(
                    String(stars)
                );
            } else
                await expect(
                    page.getByRole("button", { name: `Ustaw ${stars} gwiazdek: Hełm`, exact: true })
                ).toHaveAttribute("aria-pressed", "true");
        };

        test("continues the draft, opens recent builds and imports from home", async ({
            page,
        }, testInfo) => {
            await page.goto("/");
            await expect(page.getByRole("button", { name: "Kontynuuj build" })).toBeEnabled();
            const scan = await new AxeBuilder({ page })
                .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
                .analyze();
            expect(scan.violations).toEqual([]);
            await page.screenshot({ path: testInfo.outputPath("home.png"), fullPage: true });
            await page.getByRole("button", { name: "Kontynuuj build" }).click();
            await expectStars(page, 3);
            await page.goto("/");
            await page.getByRole("button", { name: "Otwórz build: Podstawowy" }).click();
            await expectStars(page, 9);
            await page.goto("/");
            const chooser = page.waitForEvent("filechooser");
            await page.getByRole("button", { name: "Importuj build", exact: true }).click();
            await (
                await chooser
            ).setFiles({
                name: "import.json",
                mimeType: "application/json",
                buffer: Buffer.from(JSON.stringify(payload(8))),
            });
            await expect(page).toHaveURL(/\/builder$/);
            await expectStars(page, 8);
        });

        test("round trips the library with explicit replacement and keep-both choices", async ({
            page,
        }, testInfo) => {
            await page.goto("/builds");
            const downloaded = page.waitForEvent("download");
            await page.getByRole("button", { name: "Pobierz całą bibliotekę" }).click();
            const backup = JSON.parse(await readFile(await (await downloaded).path(), "utf8"));
            expect(backup.format).toBe("broken-ranks-tool-build-library");
            expect(backup.builds[0].payload.build.backpack[0].sendToBackend).toBe(true);
            backup.builds[0].payload = payload(6);
            const file = {
                name: "backup.json",
                mimeType: "application/json",
                buffer: Buffer.from(JSON.stringify(backup)),
            };
            await page.getByLabel("Plik kopii biblioteki").setInputFiles(file);
            await page.getByLabel("Import buildu: Podstawowy").selectOption("replace:saved-one");
            const scan = await new AxeBuilder({ page })
                .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
                .analyze();
            expect(scan.violations).toEqual([]);
            await page.screenshot({
                path: testInfo.outputPath("backup-preview.png"),
                fullPage: true,
            });
            await page.getByRole("button", { name: "Importuj wybrane buildy" }).click();
            await expect(
                page.getByText("Zaimportowano wybrane buildy z kopii biblioteki.", { exact: true })
            ).toBeVisible();
            expect(
                await page.evaluate(
                    () =>
                        JSON.parse(localStorage.getItem("broken-ranks-tool.build-library.v1"))
                            .builds[0].payload.build.requestData.slots.helmet.itemStars
                )
            ).toBe(6);
            await page.getByLabel("Plik kopii biblioteki").setInputFiles(file);
            await expect(page.getByLabel("Import buildu: Podstawowy")).toHaveValue("copy");
            await page.getByRole("button", { name: "Importuj wybrane buildy" }).click();
            await expect(
                page.getByRole("complementary").getByText("Podstawowy (2)", { exact: true })
            ).toBeVisible();
            const records = await page.evaluate(
                () => JSON.parse(localStorage.getItem("broken-ranks-tool.build-library.v1")).builds
            );
            expect(records).toHaveLength(2);
            expect(new Set(records.map((entry) => entry.id)).size).toBe(2);
        });

        test("restores progression marks on reload and requires review after changing assumptions", async ({
            page,
        }) => {
            await page.goto("/progression-path");
            await page.getByLabel("Docelowy build").selectOption("current");
            await page.getByRole("button", { name: "Zaplanuj ścieżkę", exact: true }).click();
            await page.getByRole("checkbox", { name: "Poziom 20 wykonany", exact: true }).check();
            await page.getByLabel("Twój poziom", { exact: true }).fill("42");
            await page.getByLabel("Twój poziom", { exact: true }).blur();
            await page.reload();
            await expect(
                page.getByText("Masz zapisany postęp. Odtwórz plan, aby kontynuować.", {
                    exact: true,
                })
            ).toBeVisible();
            await page.getByRole("button", { name: "Odtwórz plan", exact: true }).click();
            await expect(
                page.getByRole("checkbox", { name: "Poziom 20 wykonany", exact: true })
            ).toBeChecked();
            await expect(page.getByLabel("Twój poziom", { exact: true })).toHaveValue("42");
            await page.getByLabel("Równomierny rozwój statystyk", { exact: true }).check();
            await page.getByRole("button", { name: "Zaplanuj ścieżkę", exact: true }).click();
            await expect(
                page.getByRole("checkbox", { name: "Poziom 20 wykonany", exact: true })
            ).not.toBeChecked();
            await expect(page.getByText(/Plan się zmienił/)).toBeVisible();
        });
    });
}
