import { act, render, screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EquipmentProvider } from "./EquipmentProvider";
import { useEquipment } from "../shared/state/EquipmentContext";
import { server } from "../test/server";
import { readEquipmentDraft, writeEquipmentDraft } from "./storage/workingDraftStorage";
import legacyEpicBuild from "../test/fixtures/builds/legacy-epic-build.json";
import legacyEpicCatalog from "../test/fixtures/builds/legacy-epic-catalog.json";

const ContextProbe = () => {
    const { data, gameRules, loading, initialDataError } = useEquipment();

    if (loading) return <p>Ładowanie</p>;
    if (initialDataError) return <p role="alert">{initialDataError}</p>;
    return <p>{`${data.items.length}:${gameRules.maxDrifLevel}`}</p>;
};

const ActionProbe = ({ exposeRef }) => {
    const equipment = useEquipment();
    useEffect(() => {
        exposeRef.current = equipment;
    }, [equipment, exposeRef]);
    return <p>{JSON.stringify(equipment.requestData.slots)}</p>;
};

describe("EquipmentProvider", () => {
    beforeEach(() => localStorage.clear());

    it.each(["file", "library"])(
        "loads the legacy epic build from the %s with catalogue rules",
        async (source) => {
            server.use(http.get("*/api/initial-data", () => HttpResponse.json(legacyEpicCatalog)));
            const exposeRef = { current: null };
            render(
                <EquipmentProvider>
                    <ActionProbe exposeRef={exposeRef} />
                </EquipmentProvider>
            );
            await waitFor(() => expect(exposeRef.current.loading).toBe(false));

            await act(async () => {
                if (source === "file") {
                    await exposeRef.current.loadBuildFromFile({
                        size: 10000,
                        text: async () => JSON.stringify(legacyEpicBuild),
                    });
                } else {
                    exposeRef.current.loadBuildSnapshot({ payload: legacyEpicBuild });
                }
            });

            expect(exposeRef.current.requestData).toEqual(legacyEpicBuild.build.requestData);
            expect(exposeRef.current.characterConfig).toMatchObject(
                legacyEpicBuild.build.characterConfig
            );
            expect(exposeRef.current.lockedDrifs).toEqual({ ring1: [0] });
        }
    );

    it.each(["built-in drifs", "capacity"])(
        "rejects invalid %s in imported builds without applying them",
        async (violation) => {
            server.use(http.get("*/api/initial-data", () => HttpResponse.json(legacyEpicCatalog)));
            const exposeRef = { current: null };
            render(
                <EquipmentProvider>
                    <ActionProbe exposeRef={exposeRef} />
                </EquipmentProvider>
            );
            await waitFor(() => expect(exposeRef.current.loading).toBe(false));
            const invalidBuild = JSON.parse(JSON.stringify(legacyEpicBuild));
            if (violation === "built-in drifs") {
                invalidBuild.build.requestData.slots.weapon.drifIds = [91, 83];
            } else {
                invalidBuild.build.requestData.slots.boots.drifLevels[1] = 21;
            }
            await expect(
                exposeRef.current.loadBuildFromFile({
                    size: 10000,
                    text: async () => JSON.stringify(invalidBuild),
                })
            ).rejects.toThrow(violation === "built-in drifs" ? "Wbudowane drify" : "pojemność");
            expect(exposeRef.current.requestData.slots).toEqual({});
        }
    );

    it("restores the equipment workspace and keeps later changes in browser storage", async () => {
        server.use(
            http.get("*/api/initial-data", () =>
                HttpResponse.json({
                    items: [
                        {
                            id: 7,
                            category: "HELMET",
                            rarity: "RARE",
                            tier: "X",
                            capacity: 10,
                        },
                    ],
                    orbs: [],
                    drifs: [{ id: 3, size: "SUBDRIF", bonusType: "CRITICAL_CHANCE" }],
                    gameRules: {
                        drifBasePowers: { CRITICAL_CHANCE: 4 },
                        slotOrbRules: {},
                        elementalTypes: [],
                    },
                    dictionaries: {},
                })
            )
        );
        writeEquipmentDraft({
            requestData: {
                slots: {
                    helmet: {
                        itemId: 7,
                        itemStars: 4,
                        drifIds: [3],
                        drifLevels: { 0: 6 },
                    },
                },
                characterStats: { strength: 120 },
            },
            characterConfig: { level: 140 },
            lockedSlots: ["helmet"],
            lockedDrifs: { helmet: [0] },
        });
        const exposeRef = { current: null };

        render(
            <EquipmentProvider>
                <ActionProbe exposeRef={exposeRef} />
            </EquipmentProvider>
        );
        await waitFor(() => expect(exposeRef.current.loading).toBe(false));

        expect(exposeRef.current.requestData).toEqual({
            slots: {
                helmet: {
                    itemId: 7,
                    itemStars: 4,
                    drifIds: [3],
                    drifLevels: { 0: 6 },
                },
            },
            characterStats: { strength: 120 },
        });
        expect(exposeRef.current.characterConfig).toMatchObject({ level: 140 });
        expect(exposeRef.current.lockedSlots).toEqual(["helmet"]);
        expect(exposeRef.current.lockedDrifs).toEqual({ helmet: [0] });

        act(() => exposeRef.current.toggleSlotLock("helmet"));
        await waitFor(() => expect(readEquipmentDraft().lockedSlots).toEqual([]));
    });

    it("rejects a draft that references resources outside the loaded catalogue", async () => {
        server.use(
            http.get("*/api/initial-data", () =>
                HttpResponse.json({
                    items: [],
                    orbs: [],
                    drifs: [],
                    gameRules: {},
                    dictionaries: {},
                })
            )
        );
        writeEquipmentDraft({
            requestData: {
                slots: { helmet: { itemId: 999 } },
                characterStats: {},
            },
            lockedSlots: ["helmet"],
            lockedDrifs: {},
        });
        const exposeRef = { current: null };

        render(
            <EquipmentProvider>
                <ActionProbe exposeRef={exposeRef} />
            </EquipmentProvider>
        );

        await waitFor(() => expect(exposeRef.current.loading).toBe(false));
        await waitFor(() => expect(exposeRef.current.requestData.slots).toEqual({}));
        expect(exposeRef.current.lockedSlots).toEqual([]);
        await waitFor(() => expect(readEquipmentDraft().requestData.slots).toEqual({}));
    });

    it("loads initial game data from the backend", async () => {
        server.use(
            http.get("*/api/initial-data", () =>
                HttpResponse.json({
                    items: [{ id: 1 }],
                    orbs: [],
                    drifs: [],
                    gameRules: { maxDrifLevel: 21 },
                    dictionaries: {},
                })
            )
        );

        render(
            <EquipmentProvider>
                <ContextProbe />
            </EquipmentProvider>
        );

        expect(screen.getByText("Ładowanie")).toBeInTheDocument();
        expect(await screen.findByText("1:21")).toBeInTheDocument();
    });

    it("exposes a backend error to the application", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        server.use(
            http.get("*/api/initial-data", () =>
                HttpResponse.json({ message: "Dane gry są niedostępne." }, { status: 503 })
            )
        );

        render(
            <EquipmentProvider>
                <ContextProbe />
            </EquipmentProvider>
        );

        await waitFor(() => {
            expect(screen.getByRole("alert")).toHaveTextContent("Dane gry są niedostępne.");
        });
    });

    it("updates slots and locks while protecting optimization without equipment", async () => {
        server.use(
            http.get("*/api/initial-data", () =>
                HttpResponse.json({
                    items: [],
                    orbs: [],
                    drifs: [],
                    gameRules: {},
                    dictionaries: {},
                })
            )
        );
        const exposeRef = { current: null };
        render(
            <EquipmentProvider>
                <ActionProbe exposeRef={exposeRef} />
            </EquipmentProvider>
        );
        await waitFor(() => expect(exposeRef.current.loading).toBe(false));

        await act(async () => {
            exposeRef.current.handleSlotUpdate("helmet", {
                itemId: null,
                itemStars: 1,
                orbIds: [],
                orbLevels: [],
                drifIds: [],
                drifLevels: {},
            });
            exposeRef.current.toggleSlotLock("helmet");
            exposeRef.current.toggleDrifLock("helmet", 0);
        });
        expect(exposeRef.current.lockedSlots).toEqual(["helmet"]);
        expect(exposeRef.current.lockedDrifs).toEqual({ helmet: [0] });

        const result = await exposeRef.current.runDrifOptimization({});
        expect(result).toEqual({
            success: false,
            message: "Wybierz przynajmniej jeden przedmiot, aby uruchomić optymalizację.",
            applied: false,
        });

        act(() => {
            exposeRef.current.toggleSlotLock("helmet");
            exposeRef.current.toggleDrifLock("helmet", 0);
        });
        expect(exposeRef.current.lockedSlots).toEqual([]);
        expect(exposeRef.current.lockedDrifs).toEqual({ helmet: [] });
        expect(exposeRef.current.applyOptimizationSetup(null)).toBe(false);
    });

    it("sends optimizer constraints and applies the optimized setup", async () => {
        let receivedRequest;
        const optimizedSlots = { helmet: { itemId: 2, drifIds: [9], drifLevels: { 0: 5 } } };
        server.use(
            http.get("*/api/initial-data", () =>
                HttpResponse.json({
                    items: [],
                    orbs: [],
                    drifs: [],
                    gameRules: {},
                    dictionaries: {},
                })
            ),
            http.post("*/api/optimizer/drifs", async ({ request }) => {
                receivedRequest = await request.json();
                return HttpResponse.json({
                    optimizedSetup: { slots: optimizedSlots },
                    summary: { success: true, message: "Gotowe" },
                });
            })
        );
        const exposeRef = { current: null };
        render(
            <EquipmentProvider>
                <ActionProbe exposeRef={exposeRef} />
            </EquipmentProvider>
        );
        await waitFor(() => expect(exposeRef.current.loading).toBe(false));

        act(() => {
            exposeRef.current.handleSlotUpdate("helmet", {
                itemId: 1,
                itemStars: 7,
                orbIds: [],
                orbLevels: [],
                drifIds: [8],
                drifLevels: { 0: 3 },
            });
            exposeRef.current.toggleSlotLock("helmet");
            exposeRef.current.toggleDrifLock("helmet", 0);
        });

        let result;
        await act(async () => {
            result = await exposeRef.current.runDrifOptimization({
                priorities: { CRITICAL_CHANCE: 15 },
                targetQuantities: { CRITICAL_CHANCE: { min: 1, max: 3 } },
                forceCapBonuses: ["CRITICAL_CHANCE"],
                generateVariants: true,
                maxVariantLossPercent: 5,
            });
        });

        expect(receivedRequest).toMatchObject({
            priorities: { CRITICAL_CHANCE: 15 },
            targetQuantities: { CRITICAL_CHANCE: { min: 1, max: 3 } },
            forceCapBonuses: ["CRITICAL_CHANCE"],
            forcedPercentageTargets: {},
            maximizeBonuses: [],
            generateVariants: true,
            maxVariantLossPercent: 5,
            lockedSlots: ["helmet"],
            lockedDrifs: { helmet: [0] },
        });
        expect(result).toEqual({ success: true, message: "Gotowe", applied: true });
        expect(exposeRef.current.requestData.slots).toEqual(optimizedSlots);
        expect(exposeRef.current.optimizationTrigger).toBe(1);
    });

    it("stores calculated stats together with their display sources", async () => {
        let receivedRequest;
        server.use(
            http.get("*/api/initial-data", () =>
                HttpResponse.json({
                    items: [],
                    orbs: [],
                    drifs: [],
                    gameRules: {},
                    dictionaries: {},
                })
            ),
            http.post("*/api/calculator/calculate", async ({ request }) => {
                receivedRequest = await request.json();
                return HttpResponse.json({
                    stats: { hp: 1234 },
                    drifCategories: { DEFENSIVE: ["ARMOR"] },
                    orbBonusTypes: ["HP"],
                });
            })
        );
        const exposeRef = { current: null };
        render(
            <EquipmentProvider>
                <ActionProbe exposeRef={exposeRef} />
            </EquipmentProvider>
        );
        await waitFor(() => expect(exposeRef.current.loading).toBe(false));

        act(() => {
            exposeRef.current.handleCharacterStatsUpdate(
                { strength: 120 },
                { level: 140, className: "Barbarzyńca" }
            );
        });
        await act(async () => exposeRef.current.calculateStats());

        expect(receivedRequest).toEqual({ slots: {}, characterStats: { strength: 120 } });
        expect(exposeRef.current.stats).toEqual({ hp: 1234 });
        expect(exposeRef.current.statSources).toEqual({
            drifCategories: { DEFENSIVE: ["ARMOR"] },
            orbBonusTypes: ["HP"],
        });
        expect(exposeRef.current.characterConfig).toEqual({
            level: 140,
            className: "Barbarzyńca",
        });
        expect(exposeRef.current.isCalculatingStats).toBe(false);
    });

    it("captures and restores a local build snapshot with calculated statistics", async () => {
        server.use(
            http.get("*/api/initial-data", () =>
                HttpResponse.json({
                    items: [{ id: 1 }],
                    orbs: [],
                    drifs: [],
                    gameRules: {},
                    dictionaries: {},
                })
            ),
            http.post("*/api/calculator/calculate", () =>
                HttpResponse.json({ stats: { Atak: 155 } })
            )
        );
        const exposeRef = { current: null };
        render(
            <EquipmentProvider>
                <ActionProbe exposeRef={exposeRef} />
            </EquipmentProvider>
        );
        await waitFor(() => expect(exposeRef.current.loading).toBe(false));

        act(() => {
            exposeRef.current.handleSlotUpdate("helmet", {
                itemId: 1,
                itemStars: 5,
                orbIds: [],
                orbLevels: [],
                drifIds: [],
                drifLevels: {},
            });
        });
        await act(async () => exposeRef.current.calculateStats());
        const snapshot = exposeRef.current.createBuildSnapshot();

        act(() => {
            exposeRef.current.handleSlotUpdate("helmet", {
                itemId: null,
                itemStars: 1,
                orbIds: [],
                orbLevels: [],
                drifIds: [],
                drifLevels: {},
            });
            exposeRef.current.loadBuildSnapshot(snapshot);
        });

        expect(exposeRef.current.requestData.slots.helmet.itemId).toBe(1);
        expect(exposeRef.current.stats).toEqual({ Atak: 155 });
    });

    it("returns backend optimization errors and reports calculator failures", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        server.use(
            http.get("*/api/initial-data", () =>
                HttpResponse.json({
                    items: [],
                    orbs: [],
                    drifs: [],
                    gameRules: {},
                    dictionaries: {},
                })
            ),
            http.post("*/api/optimizer/drifs", () =>
                HttpResponse.json(
                    { summary: { message: "Nie znaleziono dopuszczalnego układu." } },
                    { status: 422 }
                )
            ),
            http.post("*/api/calculator/calculate", () =>
                HttpResponse.json({ message: "Niepoprawny ekwipunek." }, { status: 400 })
            )
        );
        const exposeRef = { current: null };
        render(
            <EquipmentProvider>
                <ActionProbe exposeRef={exposeRef} />
            </EquipmentProvider>
        );
        await waitFor(() => expect(exposeRef.current.loading).toBe(false));
        act(() => {
            exposeRef.current.handleSlotUpdate("helmet", {
                itemId: 1,
                itemStars: 1,
                orbIds: [],
                orbLevels: [],
                drifIds: [],
                drifLevels: {},
            });
        });

        let optimizationError;
        await act(async () => {
            optimizationError = await exposeRef.current.runDrifOptimization({});
            await exposeRef.current.calculateStats();
        });

        expect(optimizationError).toEqual({
            success: false,
            message: "Nie znaleziono dopuszczalnego układu.",
            applied: false,
        });
        expect(exposeRef.current.calculationNotice).toEqual({
            type: "error",
            message: "Błąd obliczeń: Niepoprawny ekwipunek.",
        });
        act(() => exposeRef.current.dismissCalculationNotice());
        expect(exposeRef.current.calculationNotice).toBeNull();
        expect(exposeRef.current.isCalculatingStats).toBe(false);
    });
});
