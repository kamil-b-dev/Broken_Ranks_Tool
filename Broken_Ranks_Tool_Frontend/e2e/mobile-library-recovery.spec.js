import { readFile } from "node:fs/promises";
import { expect, test } from "./fixtures/test.js";
import { mobileDevice } from "./mobile-device.js";
import { builderCatalog } from "../src/test/fixtures/equipment/builderCatalog.js";
import { createBuildPayload } from "../src/features/builds/buildPayload.js";
import { createLocalBuildRecord } from "../src/features/builds/buildLibraryStorage.js";

const storageKey = "broken-ranks-tool.build-library.v1";
const saved = createLocalBuildRecord({
    id: "recovery-test",
    name: "Kopia do odzyskania",
    snapshot: {
        payload: createBuildPayload({
            requestData: {
                slots: {
                    helmet: {
                        itemId: 1,
                        itemStars: 3,
                        orbIds: [],
                        orbLevels: [],
                        drifIds: [],
                        drifLevels: {},
                    },
                },
                characterStats: {},
            },
            characterConfig: null,
            lockedSlots: ["helmet"],
            lockedDrifs: {},
            backpack: [
                { id: "owned", kind: "DRIF", templateId: "60", level: 6, sendToBackend: true },
            ],
        }),
    },
});

const connect = async (context) => {
    await context.route("**/api/initial-data", (route) => route.fulfill({ json: builderCatalog }));
    await context.route("**/api/calculator/calculate", (route) =>
        route.fulfill({ json: { stats: { Siła: 15 } } })
    );
};

for (const mobile of [false, true]) {
    test.describe(mobile ? "mobile library recovery" : "desktop library recovery", () => {
        if (mobile) test.use(mobileDevice);
        test("restores an exported library in a clean browser and can reopen its build", async ({
            page,
            context,
            createContext,
            browserName,
            viewport,
            userAgent,
            isMobile,
            hasTouch,
            deviceScaleFactor,
        }, testInfo) => {
            test.skip(!mobile && browserName === "webkit", "Desktop covered by Chromium.");
            await connect(context);
            await page.addInitScript(
                ({ storageKey, saved }) =>
                    localStorage.setItem(
                        storageKey,
                        JSON.stringify({ version: 1, builds: [saved] })
                    ),
                { storageKey, saved }
            );
            await page.goto("/builds");
            await expect(
                page.getByText(
                    "Kopia obejmuje zapisane buildy i ich plecaki. Nie obejmuje roboczego szkicu ani lokalnego postępu planera.",
                    { exact: true }
                )
            ).toBeVisible();
            const download = page.waitForEvent("download");
            await page.getByRole("button", { name: "Pobierz całą bibliotekę" }).click();
            const bytes = await readFile(await (await download).path());
            const exported = JSON.parse(bytes.toString("utf8"));
            expect(exported.builds).toEqual([saved]);

            const fresh = await createContext({
                viewport,
                userAgent,
                isMobile,
                hasTouch,
                deviceScaleFactor,
                reducedMotion: "reduce",
            });
            await connect(fresh);
            const restored = await fresh.newPage();
            await restored.goto("/builds");
            expect(
                await restored.evaluate((key) => localStorage.getItem(key), storageKey)
            ).toBeNull();
            await restored.getByLabel("Plik kopii biblioteki").setInputFiles({
                name: "library.json",
                mimeType: "application/json",
                buffer: bytes,
            });
            await restored.getByRole("button", { name: "Importuj wybrane buildy" }).click();
            await expect(
                restored.getByText("Zaimportowano wybrane buildy z kopii biblioteki.", {
                    exact: true,
                })
            ).toBeVisible();
            expect(
                await restored.evaluate(
                    (key) => JSON.parse(localStorage.getItem(key)).builds,
                    storageKey
                )
            ).toEqual(exported.builds);
            await restored.reload();
            await expect(
                restored.getByRole("button", { name: "Pobierz całą bibliotekę" })
            ).toBeEnabled();
            await restored.goto("/");
            await restored
                .getByRole("button", { name: "Otwórz build: Kopia do odzyskania" })
                .click();
            await expect(restored).toHaveURL(/\/builder$/);
            if (mobile) {
                await restored
                    .getByRole("button", { name: "Edytuj slot: Hełm", exact: true })
                    .click();
                await expect(restored.getByLabel("Gwiazdki", { exact: true })).toHaveValue("3");
            } else
                await expect(
                    restored.getByRole("button", { name: "Ustaw 3 gwiazdek: Hełm", exact: true })
                ).toHaveAttribute("aria-pressed", "true");
            await restored.getByText("O projekcie i danych", { exact: true }).click();
            await expect(
                restored.getByRole("link", { name: "Zgłoś podatność prywatnie" })
            ).toBeVisible();
            expect(
                await restored.evaluate(
                    () => document.documentElement.scrollWidth <= window.innerWidth
                )
            ).toBe(true);
            await restored.screenshot({
                path: testInfo.outputPath("project-information.png"),
                fullPage: true,
            });
        });
    });
}
