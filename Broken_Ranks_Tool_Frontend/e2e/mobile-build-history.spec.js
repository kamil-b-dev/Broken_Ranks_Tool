import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures/test.js";
import { mobileDevice } from "./mobile-device.js";
import { builderCatalog } from "../src/test/fixtures/equipment/builderCatalog.js";

const draftKey = "broken-ranks-tool.equipment-draft.v3";
const libraryKey = "broken-ranks-tool.build-library.v1";

for (const mobile of [false, true]) {
    test.describe(mobile ? "mobile build history" : "desktop build history", () => {
        if (mobile) test.use(mobileDevice);
        test.beforeEach(async ({ page, browserName }) => {
            test.skip(!mobile && browserName === "webkit", "Desktop is covered by Chromium.");
            await page.route("**/api/initial-data", (route) =>
                route.fulfill({ json: builderCatalog })
            );
            await page.route("**/api/calculator/calculate", (route) =>
                route.fulfill({ json: { stats: { Siła: 15 } } })
            );
            await page.addInitScript(
                ({ draftKey }) => {
                    if (!localStorage.getItem(draftKey))
                        localStorage.setItem(
                            draftKey,
                            JSON.stringify({
                                version: 3,
                                value: {
                                    requestData: {
                                        slots: {
                                            helmet: {
                                                itemId: 1,
                                                itemStars: 1,
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
                                    backpack: [],
                                },
                            })
                        );
                    const original = Storage.prototype.setItem;
                    Storage.prototype.setItem = function (key, value) {
                        if (key === draftKey && window.failDraftSave)
                            throw new DOMException("full", "QuotaExceededError");
                        return original.call(this, key, value);
                    };
                },
                { draftKey }
            );
        });

        const openEditor = async (page) => {
            await page.goto("/builder");
            if (mobile)
                await page.getByRole("button", { name: "Edytuj slot: Hełm", exact: true }).click();
        };
        const changeStars = async (page, stars) => {
            if (mobile)
                await page.getByLabel("Gwiazdki", { exact: true }).selectOption(String(stars));
            else
                await page
                    .getByRole("button", { name: `Ustaw ${stars} gwiazdek: Hełm`, exact: true })
                    .click();
        };
        const expectStars = async (page, stars) => {
            if (mobile)
                await expect(page.getByLabel("Gwiazdki", { exact: true })).toHaveValue(
                    String(stars)
                );
            else
                await expect(
                    page.getByRole("button", { name: `Ustaw ${stars} gwiazdek: Hełm`, exact: true })
                ).toHaveAttribute("aria-pressed", "true");
        };

        test("undoes and redoes edits, preserves the restored build on reload", async ({
            page,
        }, testInfo) => {
            await openEditor(page);
            await expect(page.getByRole("button", { name: "Cofnij", exact: true })).toBeDisabled();
            await changeStars(page, 9);
            await page.getByRole("button", { name: "Cofnij", exact: true }).click();
            await expectStars(page, 1);
            await page.getByRole("button", { name: "Ponów", exact: true }).click();
            await expectStars(page, 9);
            await page.getByRole("button", { name: "Cofnij", exact: true }).click();
            await expectStars(page, 1);
            await page.getByRole("button", { name: "Ponów", exact: true }).focus();
            await page.keyboard.press("Control+Shift+Z");
            await expectStars(page, 9);
            await expect
                .poll(() =>
                    page.evaluate(
                        (key) =>
                            JSON.parse(localStorage.getItem(key)).value.requestData.slots.helmet
                                .itemStars,
                        draftKey
                    )
                )
                .toBe(9);
            const scan = await new AxeBuilder({ page })
                .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
                .analyze();
            expect(scan.violations).toEqual([]);
            await page.screenshot({ path: testInfo.outputPath("history-controls.png") });
            await page.reload();
            await expectStars(page, 9);
            await expect(page.getByRole("button", { name: "Cofnij", exact: true })).toBeDisabled();
        });

        test("reports failed autosave, downloads the current build and retries saving", async ({
            page,
        }) => {
            await openEditor(page);
            await page.evaluate(() => {
                window.failDraftSave = true;
            });
            await changeStars(page, 9);
            await expect(page.getByRole("alert")).toContainText(
                "Nie udało się automatycznie zapisać buildu"
            );
            const downloaded = page.waitForEvent("download");
            await page.getByRole("button", { name: "Pobierz kopię do pliku", exact: true }).click();
            const file = await downloaded;
            const payload = JSON.parse(await readFile(await file.path(), "utf8"));
            expect(payload.build.requestData.slots.helmet.itemStars).toBe(9);
            await page.evaluate(() => {
                window.failDraftSave = false;
            });
            await page.getByRole("button", { name: "Ponów zapis", exact: true }).click();
            await expect(page.getByRole("alert")).toHaveCount(0);
            await expect
                .poll(() =>
                    page.evaluate(
                        (key) =>
                            JSON.parse(localStorage.getItem(key)).value.requestData.slots.helmet
                                .itemStars,
                        draftKey
                    )
                )
                .toBe(9);
        });

        test("archives damaged library bytes before unlocking writes", async ({ page }) => {
            await page.addInitScript(
                ({ libraryKey }) => localStorage.setItem(libraryKey, "{damaged library"),
                { libraryKey }
            );
            await openEditor(page);
            await expect(page.getByRole("alert")).toContainText("Zapis jest zablokowany");
            const downloaded = page.waitForEvent("download");
            await page
                .getByRole("button", { name: "Pobierz oryginalną bibliotekę", exact: true })
                .click();
            expect(await readFile(await (await downloaded).path(), "utf8")).toBe(
                "{damaged library"
            );
            await page
                .getByRole("button", {
                    name: "Zachowaj kopię i odzyskaj czytelne buildy",
                    exact: true,
                })
                .click();
            await expect(
                page.getByText(
                    "Zachowano kopię oryginalnych danych. Odzyskano czytelne buildy i odblokowano zapis.",
                    { exact: true }
                )
            ).toBeVisible();
            expect(
                await page.evaluate((key) => localStorage.getItem(key + ".recovery"), libraryKey)
            ).toBe("{damaged library");
            expect(
                await page.evaluate(
                    (key) => JSON.parse(localStorage.getItem(key)).builds,
                    libraryKey
                )
            ).toEqual([]);
        });
    });
}
