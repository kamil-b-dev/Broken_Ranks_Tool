import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cancelAdvisorOptimization, optimizeEquipmentDrifs } from "../../shared/api/equipmentApi";
import { useEquipmentOptimization } from "./useEquipmentOptimization";

vi.mock("../../shared/api/equipmentApi", () => ({
    optimizeEquipmentDrifs: vi.fn(),
    cancelAdvisorOptimization: vi.fn(),
}));

afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
});

const renderOptimization = (slots = {}) => {
    const setRequestData = vi.fn();
    const restoreStats = vi.fn();
    const requestData = { slots, characterStats: { Moc: 135 } };
    const hook = renderHook(() =>
        useEquipmentOptimization({
            requestData,
            setRequestData,
            restoreStats,
            lockedSlots: ["helmet"],
            lockedDrifs: { helmet: [0] },
        })
    );
    return { ...hook, setRequestData, restoreStats, requestData };
};

describe("useEquipmentOptimization", () => {
    it("rejects optimization without an equipped item", async () => {
        const { result } = renderOptimization({ helmet: { itemId: null } });

        let response;
        await act(async () => {
            response = await result.current.runDrifOptimization({});
        });

        expect(response).toMatchObject({ success: false, applied: false });
        expect(optimizeEquipmentDrifs).not.toHaveBeenCalled();
    });

    it("sends locks, applies the optimized setup, and signals a refresh", async () => {
        const optimizedSetup = { slots: { helmet: { itemId: 9 } } };
        const calculationResult = {
            stats: { Moc: "135", CRITICAL_CHANCE: "9%" },
            drifCategories: { CRITICAL_CHANCE: "OFFENSIVE" },
            orbBonusTypes: [],
        };
        optimizeEquipmentDrifs.mockResolvedValue({
            optimizedSetup,
            summary: { success: true },
            calculationResult,
        });
        const { result, setRequestData, restoreStats } = renderOptimization({
            helmet: { itemId: 7 },
        });

        let response;
        await act(async () => {
            response = await result.current.runDrifOptimization({ priorities: { TEST: 10 } });
        });

        expect(optimizeEquipmentDrifs).toHaveBeenCalledWith(
            expect.objectContaining({
                originalSlots: { helmet: { itemId: 7 } },
                characterStats: { Moc: 135 },
                lockedSlots: ["helmet"],
                lockedDrifs: { helmet: [0] },
            })
        );
        expect(response).toEqual({ success: true, applied: true });
        const nextRequestData = {
            slots: optimizedSetup.slots,
            characterStats: { Moc: 135 },
        };
        expect(setRequestData).toHaveBeenCalledWith(nextRequestData);
        expect(restoreStats).toHaveBeenCalledWith(
            calculationResult.stats,
            calculationResult,
            nextRequestData
        );
        expect(result.current.optimizationTrigger).toBe(1);
    });

    it("applies the main setup even when a percentage target is not reached", async () => {
        const optimizedSetup = {
            slots: {
                weapon: { itemId: 174, drifIds: [83, 91], drifLevels: { 0: 16, 1: 16 } },
                armor: { itemId: 2, drifIds: [92], drifLevels: { 0: 21 } },
            },
        };
        const summary = {
            success: false,
            warnings: ["Podwojny atak (59.18/60.00)."],
        };
        optimizeEquipmentDrifs.mockResolvedValue({ optimizedSetup, summary });
        const { result, setRequestData } = renderOptimization({ weapon: { itemId: 174 } });

        let response;
        await act(async () => {
            response = await result.current.runDrifOptimization({});
        });

        expect(response).toEqual({ ...summary, applied: true });
        expect(setRequestData).toHaveBeenCalledWith({
            slots: optimizedSetup.slots,
            characterStats: { Moc: 135 },
        });
        expect(result.current.optimizationTrigger).toBe(1);
    });

    it.each([undefined, {}, { slots: {} }, { slots: { helmet: null } }])(
        "keeps equipment when optimization returns no usable setup: %j",
        async (optimizedSetup) => {
            optimizeEquipmentDrifs.mockResolvedValue({
                optimizedSetup,
                summary: { success: false },
            });
            const { result, setRequestData } = renderOptimization({ helmet: { itemId: 7 } });

            let response;
            await act(async () => {
                response = await result.current.runDrifOptimization({});
            });

            expect(response.applied).toBe(false);
            expect(setRequestData).not.toHaveBeenCalled();
            expect(result.current.optimizationTrigger).toBe(0);
        }
    );

    it("normalizes optimizer timeout failures", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        optimizeEquipmentDrifs.mockRejectedValue({ code: "ECONNABORTED" });
        const { result } = renderOptimization({ helmet: { itemId: 7 } });

        let response;
        await act(async () => {
            response = await result.current.runDrifOptimization({});
        });

        expect(response).toEqual({
            success: false,
            message: "Przekroczono limit czasu optymalizacji.",
            applied: false,
        });
    });

    it("returns advisor recommendations without applying them automatically", async () => {
        optimizeEquipmentDrifs.mockResolvedValue({
            optimizedSetup: { slots: { helmet: { itemId: 9 } } },
            summary: { success: true },
        });
        const { result, setRequestData } = renderOptimization({ helmet: { itemId: 7 } });

        let response;
        await act(async () => {
            response = await result.current.runDrifOptimization({
                mode: "ADVISOR",
                priorities: { TEST: 10 },
            });
        });

        expect(response).toEqual({ success: true, applied: false });
        expect(setRequestData).not.toHaveBeenCalled();
    });

    it("makes one advisor request and preserves backend ranking and action plans", async () => {
        const setup = { slots: { helmet: { itemId: 7, itemStars: 7 } } };
        optimizeEquipmentDrifs.mockResolvedValue({
            optimizedSetup: setup,
            summary: {
                success: true,
                nextVariants: [{ bonusName: "Same przełożenia", gain: 1.5, setup }],
            },
            advisorReport: {
                plans: [{ kind: "MOVES", actions: ["Przenieś drif"], targetReached: true }],
            },
        });
        const { result, setRequestData } = renderOptimization({ helmet: { itemId: 7 } });
        let response;
        await act(async () => {
            response = await result.current.runDrifOptimization({
                mode: "ADVISOR",
                priorities: { TEST: 30 },
                advisor: { goal: "TEST", timeBudgetMs: 1500 },
            });
        });
        expect(optimizeEquipmentDrifs).toHaveBeenCalledTimes(1);
        expect(optimizeEquipmentDrifs.mock.calls[0][0].advisor).toMatchObject({
            goal: "TEST",
            runId: expect.any(String),
        });
        expect(response.nextVariants[0]).toMatchObject({
            advisorGain: 1.5,
            advisorActions: ["Przenieś drif"],
            advisorKind: "MOVES",
        });
        expect(setRequestData).not.toHaveBeenCalled();
    });

    it("cancels the search without discarding the original response", async () => {
        let finish;
        optimizeEquipmentDrifs.mockImplementation(
            () =>
                new Promise((resolve) => {
                    finish = resolve;
                })
        );
        const { result } = renderOptimization({ helmet: { itemId: 7 } });
        let pending;
        await act(async () => {
            pending = result.current.runDrifOptimization({
                mode: "ADVISOR",
                advisor: { goal: "TEST" },
            });
        });
        const runId = optimizeEquipmentDrifs.mock.calls[0][0].advisor.runId;
        await act(async () => {
            await result.current.cancelDrifOptimization();
        });
        expect(cancelAdvisorOptimization).toHaveBeenCalledWith(runId);
        await act(async () => {
            finish({
                summary: { success: true, nextVariants: [] },
                advisorReport: { cancelled: true, plans: [] },
            });
            expect((await pending).advisorReport.cancelled).toBe(true);
        });
    });

    it("keeps cancellation attached to the newest overlapping advisor run", async () => {
        const finishes = [];
        optimizeEquipmentDrifs.mockImplementation(
            () => new Promise((resolve) => finishes.push(resolve))
        );
        const { result } = renderOptimization({ helmet: { itemId: 7 } });
        let first;
        let second;

        act(() => {
            first = result.current.runDrifOptimization({
                mode: "ADVISOR",
                advisor: { goal: "TEST" },
            });
            second = result.current.runDrifOptimization({
                mode: "ADVISOR",
                advisor: { goal: "TEST" },
            });
        });
        const newestRunId = optimizeEquipmentDrifs.mock.calls[1][0].advisor.runId;

        await act(async () => {
            finishes[0]({ summary: { success: true } });
            await first;
        });
        await act(async () => result.current.cancelDrifOptimization());
        expect(cancelAdvisorOptimization).toHaveBeenCalledWith(newestRunId);

        await act(async () => {
            finishes[1]({ summary: { success: true } });
            await second;
        });
    });
});
