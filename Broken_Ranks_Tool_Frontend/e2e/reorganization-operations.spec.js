import { expect, test } from "@playwright/test";
import { builderCatalog } from "../src/test/fixtures/equipment/builderCatalog.js";

const stone = (itemId, drifIds, drifLevels) => ({
    itemId,
    itemStars: 1,
    orbIds: [],
    orbLevels: [],
    drifIds,
    drifLevels,
});
const original = { helmet: stone(1, [60], { 0: 2 }), armor: stone(2, [], {}) };
for (const layout of ["desktop", "mobile"])
    for (const task of ["INSERT", "RESERVE"]) {
        test(
            layout + " executes " + task + " with a concise operational form",
            async ({ page }) => {
                await page.setViewportSize(
                    layout === "desktop"
                        ? { width: 1600, height: 1000 }
                        : { width: 390, height: 844 }
                );
                await page.addInitScript(
                    ({ original, task }) => {
                        localStorage.setItem(
                            "broken-ranks-tool.equipment-draft.v3",
                            JSON.stringify({
                                version: 3,
                                value: {
                                    requestData: { slots: original, characterStats: {} },
                                    backpack: [
                                        {
                                            id: "chosen",
                                            kind: "DRIF",
                                            templateId: 60,
                                            level: 6,
                                            sendToBackend: false,
                                        },
                                        {
                                            id: "unused",
                                            kind: "DRIF",
                                            templateId: 60,
                                            level: 6,
                                            sendToBackend: true,
                                        },
                                    ],
                                    lockedSlots: [],
                                    lockedDrifs: {},
                                    characterConfig: null,
                                },
                            })
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
                                            task,
                                            includeBackpack: true,
                                            insertEntryId: "chosen",
                                            reservation: {
                                                slotKey: "helmet",
                                                freeSockets: 3,
                                                freeCapacity: 12,
                                            },
                                        },
                                    },
                                },
                            })
                        );
                    },
                    { original, task }
                );
                await page.route("**/api/initial-data", (route) =>
                    route.fulfill({ json: builderCatalog })
                );
                await page.route("**/api/calculator/calculate", (route) =>
                    route.fulfill({ json: { stats: { CRITICAL_CHANCE: "10%" } } })
                );
                const final =
                    task === "INSERT"
                        ? { helmet: original.helmet, armor: stone(2, [60], { 0: 6 }) }
                        : { helmet: stone(1, [], {}), armor: stone(2, [60], { 0: 2 }) };
                let received;
                await page.route("**/api/optimizer/drifs", (route) => {
                    received = route.request().postDataJSON();
                    const usages =
                        task === "INSERT"
                            ? [
                                  {
                                      entryId: null,
                                      sourceSlotKey: "helmet",
                                      sourceDrifIndex: 0,
                                      slotKey: "helmet",
                                      drifIndex: 0,
                                  },
                                  {
                                      entryId: "chosen",
                                      sourceSlotKey: null,
                                      sourceDrifIndex: null,
                                      slotKey: "armor",
                                      drifIndex: 0,
                                  },
                              ]
                            : [
                                  {
                                      entryId: null,
                                      sourceSlotKey: "helmet",
                                      sourceDrifIndex: 0,
                                      slotKey: "armor",
                                      drifIndex: 0,
                                  },
                              ];
                    return route.fulfill({
                        json: {
                            optimizedSetup: { slots: final },
                            reorganizationDrifUsages: usages,
                            reorganizationStatChanges: [],
                            calculationResult: { stats: { CRITICAL_CHANCE: "10%" } },
                            summary: { success: true, outcome: "VALID_BUILD", nextVariants: [] },
                        },
                    });
                });
                await page.goto("/optimizer?ui=" + layout);
                await expect(
                    page.getByRole("button", {
                        name: task === "INSERT" ? "Wstaw drif" : "Zwolnij miejsce",
                        exact: true,
                    })
                ).toHaveAttribute("aria-pressed", "true");
                await expect(page.getByText("Pula drifów", { exact: true })).toHaveCount(0);
                const form = page.locator(".reorganization-goals");
                await expect(form).toHaveCSS("font-family", /Inter/);
                await expect(page.getByLabel("Dołącz zaznaczone drify z plecaka")).toHaveCount(0);
                await page.screenshot({
                    path: "../tmp/reorganization-" + task.toLowerCase() + "-" + layout + ".png",
                    fullPage: true,
                });
                await page.getByRole("button", { name: /Uruchom optymalizację/i }).click();
                await expect.poll(() => received?.reorganization?.task).toBe(task);
                if (task === "INSERT")
                    expect(received.backpackDrifs).toEqual([
                        { id: "chosen", templateId: 60, level: 6 },
                    ]);
                else {
                    expect(received.backpackDrifs).toEqual([]);
                    expect(received.reorganization.reservation).toEqual({
                        slotKey: "helmet",
                        freeSockets: 3,
                        freeCapacity: 12,
                    });
                }
                await expect
                    .poll(() =>
                        page.evaluate(
                            () =>
                                JSON.parse(
                                    localStorage.getItem("broken-ranks-tool.equipment-draft.v3")
                                ).value.requestData.slots.armor.drifLevels[0]
                        )
                    )
                    .toBe(task === "INSERT" ? 6 : 2);
                const contents = await page.evaluate(
                    () =>
                        JSON.parse(localStorage.getItem("broken-ranks-tool.equipment-draft.v3"))
                            .value.backpack
                );
                expect(contents.some((entry) => entry.id === "chosen")).toBe(task === "RESERVE");
                expect(contents.find((entry) => entry.id === "unused")).toMatchObject({
                    sendToBackend: true,
                    level: 6,
                });
                expect(
                    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
                ).toBe(true);
            }
        );
    }
