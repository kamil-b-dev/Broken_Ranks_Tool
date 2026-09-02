import { act, render, screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import { EquipmentProvider, useEquipment } from "./EquipmentContext";
import { server } from "../test/server";

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
        vi.spyOn(window, "alert").mockImplementation(() => {});
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
        expect(window.alert).toHaveBeenCalledWith("BŁĄD ZAPISU: Niepoprawny ekwipunek.");
        expect(exposeRef.current.isCalculatingStats).toBe(false);
    });
});
