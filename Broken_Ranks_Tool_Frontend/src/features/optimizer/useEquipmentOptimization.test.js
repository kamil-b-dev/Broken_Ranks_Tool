import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cancelAdvisorOptimization, optimizeEquipmentDrifs } from "../../shared/api/equipmentApi";
import { useEquipmentOptimization } from "./useEquipmentOptimization";
import { builderCatalog } from "../../test/fixtures/equipment/builderCatalog";

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
    it("preserves the reorganization task on HTTP 429 and reports the server retry delay without changing inventory", async () => {
        const { result, setRequestData, restoreStats } = renderOptimization({
            boots: { itemId: 19 },
        });
        const reorganization = {
            task: "UPGRADE",
            upgrades: [
                {
                    sourceSlotKey: "boots",
                    sourceDrifIndex: 1,
                    targetTemplateId: 52,
                    targetLevel: 11,
                },
            ],
        };
        vi.spyOn(console, "error").mockImplementation(() => {});
        optimizeEquipmentDrifs.mockRejectedValue({
            response: {
                status: 429,
                headers: { "retry-after": "37" },
                data: { message: "Przekroczono limit żądań. Spróbuj ponownie później." },
            },
        });
        await act(async () => {
            expect(
                await result.current.runDrifOptimization({ mode: "REORGANIZE", reorganization })
            ).toEqual({
                success: false,
                applied: false,
                mode: "REORGANIZE",
                reorganizationOptions: reorganization,
                message: "Przekroczono limit żądań. Spróbuj ponownie za 37 s.",
            });
        });
        expect(optimizeEquipmentDrifs).toHaveBeenCalledTimes(1);
        expect(setRequestData).not.toHaveBeenCalled();
        expect(restoreStats).not.toHaveBeenCalled();
    });

    it("keeps the server message when Retry-After is unavailable", async () => {
        const { result } = renderOptimization({ boots: { itemId: 19 } });
        vi.spyOn(console, "error").mockImplementation(() => {});
        optimizeEquipmentDrifs.mockRejectedValue({
            response: {
                status: 429,
                headers: {},
                data: { message: "Przekroczono limit żądań. Spróbuj ponownie później." },
            },
        });
        await act(async () => {
            expect(await result.current.runDrifOptimization({ mode: "REORGANIZE" })).toMatchObject({
                mode: "REORGANIZE",
                message: "Przekroczono limit żądań. Spróbuj ponownie później.",
            });
        });
    });

    it("validates built-in stones with catalog rules while allowing their normal upgrade and keeping them out of the backpack", async () => {
        const original = {
            itemId: 99,
            itemStars: 1,
            drifIds: [61],
            drifLevels: { 0: 2 },
            orbIds: [],
            orbLevels: [],
        };
        const setup = { slots: { helmet: { ...original, drifLevels: { 0: 16 } } } };
        const gameRules = {
            ...builderCatalog.gameRules,
            epicBuiltInDrifs: { Epik: ["CRITICAL_CHANCE"] },
        };
        const props = {
            requestData: { slots: { helmet: original } },
            lockedSlots: [],
            lockedDrifs: {},
            backpack: [],
            setRequestData: vi.fn(),
            setBackpack: vi.fn(),
            restoreStats: vi.fn(),
            gameRules,
            data: {
                ...builderCatalog,
                gameRules: undefined,
                items: [
                    {
                        ...builderCatalog.items[0],
                        id: 99,
                        name: "Epik X",
                        rarity: "EPIC",
                        capacity: 0,
                    },
                ],
                drifs: [{ ...builderCatalog.drifs[0], id: 61, size: "MAGNIDRIF" }],
            },
        };
        optimizeEquipmentDrifs.mockResolvedValue({
            optimizedSetup: setup,
            targetSetup: setup,
            backpackDrifUsages: [],
            summary: { success: true, outcome: "VALID_BUILD" },
        });
        const { result } = renderHook(() => useEquipmentOptimization(props));
        await act(async () =>
            expect(await result.current.runDrifOptimization({ backpackOnly: true })).toMatchObject({
                applied: true,
            })
        );
        expect(props.setBackpack).toHaveBeenCalledWith([]);
        expect(props.setRequestData.mock.lastCall[0].slots.helmet.drifLevels[0]).toBe(16);
    });
    it("reports unsafe selected IDs without sending a rounded template ID or changing state", async () => {
        const props = {
            requestData: { slots: { helmet: { itemId: 1 } } },
            backpack: [
                {
                    id: "unsafe",
                    kind: "DRIF",
                    templateId: "9007199254740993",
                    level: 1,
                    sendToBackend: true,
                },
            ],
            setRequestData: vi.fn(),
            setBackpack: vi.fn(),
            restoreStats: vi.fn(),
            lockedSlots: [],
            lockedDrifs: {},
        };
        const { result } = renderHook(() => useEquipmentOptimization(props));
        await act(async () =>
            expect(await result.current.runDrifOptimization({ backpackOnly: true })).toMatchObject({
                success: false,
                applied: false,
                message: expect.stringContaining("bezpiecznie"),
            })
        );
        expect(optimizeEquipmentDrifs).not.toHaveBeenCalled();
        expect(props.setRequestData).not.toHaveBeenCalled();
        expect(props.setBackpack).not.toHaveBeenCalled();
    });
    it("applies a weaker final build, consumes only reported copies and retains its upgrade target", async () => {
        const stone = { id: "used", kind: "DRIF", templateId: "60", level: 3, sendToBackend: true };
        const original = { itemId: 1, drifIds: [60], drifLevels: { 0: 2 } };
        const props = {
            requestData: { slots: { helmet: original } },
            lockedSlots: [],
            lockedDrifs: {},
            backpack: [{ ...stone, id: "unused" }, stone],
            setRequestData: vi.fn(),
            setBackpack: vi.fn(),
            restoreStats: vi.fn(),
        };
        const targetSetup = {
            slots: { helmet: { ...original, drifIds: [60, 61], drifLevels: { 0: 6, 1: 21 } } },
        };
        const optimizedSetup = {
            slots: { helmet: { ...original, drifIds: [60, 61], drifLevels: { 0: 3, 1: 21 } } },
        };
        const calculationResult = { stats: { CRITICAL_CHANCE: "5%" } };
        optimizeEquipmentDrifs.mockResolvedValue({
            targetSetup,
            optimizedSetup,
            calculationResult,
            backpackDrifUsages: [{ entryId: "used", slotKey: "helmet", drifIndex: 0 }],
            summary: { success: false, outcome: "VALID_BUILD_SOFT_TARGETS_UNMET" },
        });
        const { result } = renderHook(() => useEquipmentOptimization(props));
        await act(async () => {
            expect(await result.current.runDrifOptimization({ backpackOnly: true })).toMatchObject({
                applied: true,
                targetSetup,
                backpackDrifTargets: [{ level: 3, targetLevel: 6, entryId: "used" }],
            });
        });
        expect(props.setRequestData).toHaveBeenCalledWith(
            expect.objectContaining({ slots: optimizedSetup.slots })
        );
        expect(props.setBackpack.mock.calls[0][0]).toEqual([
            { ...stone, id: "unused" },
            expect.objectContaining({ templateId: "60", level: 2 }),
        ]);
        expect(props.restoreStats).toHaveBeenCalledWith(
            calculationResult.stats,
            calculationResult,
            expect.any(Object)
        );
    });
    it.each(["selection", "level", "removal"])(
        "does not consume inventory when backpack %s changes during optimization",
        async (change) => {
            let finish;
            optimizeEquipmentDrifs.mockImplementation(
                () =>
                    new Promise((resolve) => {
                        finish = resolve;
                    })
            );
            const entry = {
                id: "owned",
                kind: "DRIF",
                templateId: "60",
                level: 6,
                sendToBackend: true,
            };
            const props = {
                requestData: { slots: { helmet: { itemId: 1, drifIds: [], drifLevels: {} } } },
                lockedSlots: [],
                lockedDrifs: {},
                backpack: [entry],
                setRequestData: vi.fn(),
                setBackpack: vi.fn(),
                restoreStats: vi.fn(),
            };
            const { result, rerender } = renderHook((inputs) => useEquipmentOptimization(inputs), {
                initialProps: props,
            });
            let pending;
            await act(async () => {
                pending = result.current.runDrifOptimization({
                    configurationMode: "ADVANCED",
                    backpackOnly: true,
                });
            });
            rerender({
                ...props,
                backpack:
                    change === "removal"
                        ? []
                        : [
                              {
                                  ...entry,
                                  ...(change === "level" ? { level: 5 } : { sendToBackend: false }),
                              },
                          ],
            });
            await act(async () => {
                finish({
                    optimizedSetup: {
                        slots: { helmet: { itemId: 1, drifIds: [60], drifLevels: { 0: 6 } } },
                    },
                    summary: { success: true, outcome: "VALID_BUILD" },
                });
                expect(await pending).toMatchObject({ applied: false, success: false });
            });
            expect(props.setBackpack).not.toHaveBeenCalled();
            expect(props.setRequestData).not.toHaveBeenCalled();
            expect(props.restoreStats).not.toHaveBeenCalled();
        }
    );
    it.each([
        ["INVALID_INPUT", false],
        ["NO_BUILD_FOUND", false],
        ["VALID_BUILD", true],
        ["VALID_BUILD_SOFT_TARGETS_UNMET", true],
    ])(
        "uses explicit outcome %s when deciding whether to apply a returned build",
        async (outcome, applied) => {
            optimizeEquipmentDrifs.mockResolvedValue({
                optimizedSetup: { slots: { helmet: { itemId: 9 } } },
                summary: { success: false, outcome },
                calculationResult: { stats: { Siła: "10" } },
            });
            const { result, setRequestData } = renderOptimization({ helmet: { itemId: 7 } });
            await act(async () => {
                expect(await result.current.runDrifOptimization({})).toMatchObject({
                    applied,
                    outcome,
                });
            });
            expect(setRequestData).toHaveBeenCalledTimes(applied ? 1 : 0);
        }
    );
    it("does not apply a pending result after its owning workflow invalidates the run", async () => {
        let finish;
        optimizeEquipmentDrifs.mockImplementation(
            () =>
                new Promise((resolve) => {
                    finish = resolve;
                })
        );
        const { result, setRequestData, restoreStats } = renderOptimization({
            helmet: { itemId: 7 },
        });
        let pending;
        await act(async () => {
            pending = result.current.runDrifOptimization({});
        });
        act(() => result.current.invalidateDrifOptimization());
        await act(async () => {
            finish({
                optimizedSetup: { slots: { helmet: { itemId: 9 } } },
                summary: { success: true },
                calculationResult: { stats: { Siła: "10" } },
            });
            expect(await pending).toMatchObject({ applied: false });
        });
        expect(setRequestData).not.toHaveBeenCalled();
        expect(restoreStats).not.toHaveBeenCalled();
    });
    it.each(["equipment", "character stats", "slot locks", "drif locks"])(
        "discards a result after changing %s during optimization",
        async (changed) => {
            let finish;
            optimizeEquipmentDrifs.mockImplementation(
                () =>
                    new Promise((resolve) => {
                        finish = resolve;
                    })
            );
            const setRequestData = vi.fn();
            const restoreStats = vi.fn();
            const props = {
                requestData: { slots: { helmet: { itemId: 7 } }, characterStats: { Moc: 135 } },
                setRequestData,
                restoreStats,
                lockedSlots: [],
                lockedDrifs: {},
            };
            const { result, rerender } = renderHook((inputs) => useEquipmentOptimization(inputs), {
                initialProps: props,
            });
            let pending;
            await act(async () => {
                pending = result.current.runDrifOptimization({});
            });
            const next = {
                ...props,
                ...(changed === "equipment"
                    ? { requestData: { ...props.requestData, slots: { helmet: { itemId: 10 } } } }
                    : {}),
                ...(changed === "character stats"
                    ? { requestData: { ...props.requestData, characterStats: { Moc: 200 } } }
                    : {}),
                ...(changed === "slot locks" ? { lockedSlots: ["helmet"] } : {}),
                ...(changed === "drif locks" ? { lockedDrifs: { helmet: [0] } } : {}),
            };
            rerender(next);
            await act(async () => {
                finish({
                    optimizedSetup: { slots: { helmet: { itemId: 9 } } },
                    summary: { success: true, nextVariants: [{ setup: { slots: {} } }] },
                });
                expect(await pending).toMatchObject({
                    success: false,
                    applied: false,
                    nextVariants: [],
                });
            });
            expect(setRequestData).not.toHaveBeenCalled();
            expect(restoreStats).not.toHaveBeenCalled();
        }
    );

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
        expect(response).toMatchObject({ success: true, applied: true });
        expect(response.baselineSignature).toBeDefined();
        expect(response.appliedSignature).toBeDefined();
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

        expect(response).toMatchObject({ ...summary, applied: true });
        expect(setRequestData).toHaveBeenCalledWith({
            slots: optimizedSetup.slots,
            characterStats: { Moc: 135 },
        });
        expect(result.current.optimizationTrigger).toBe(1);
    });

    it("does not apply an older optimization result after a newer run finishes", async () => {
        const finishes = [];
        optimizeEquipmentDrifs.mockImplementation(
            () => new Promise((resolve) => finishes.push(resolve))
        );
        const { result, setRequestData } = renderOptimization({ helmet: { itemId: 7 } });
        let first;
        let second;

        await act(async () => {
            first = result.current.runDrifOptimization({});
            second = result.current.runDrifOptimization({});
        });
        await act(async () => {
            finishes[1]({
                optimizedSetup: { slots: { helmet: { itemId: 9 } } },
                summary: { success: true },
            });
            await second;
        });
        await act(async () => {
            finishes[0]({
                optimizedSetup: { slots: { helmet: { itemId: 8 } } },
                summary: { success: true },
            });
            expect((await first).applied).toBe(false);
        });

        expect(setRequestData).toHaveBeenCalledTimes(1);
        expect(setRequestData).toHaveBeenCalledWith(
            expect.objectContaining({ slots: { helmet: { itemId: 9 } } })
        );
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
                advisor: { goal: "TEST", timeBudgetMs: 3000 },
            });
        });
        expect(optimizeEquipmentDrifs).toHaveBeenCalledTimes(1);
        expect(optimizeEquipmentDrifs.mock.calls[0][0].advisor).toMatchObject({
            goal: "TEST",
            runId: expect.any(String),
            cancellationToken: expect.any(String),
        });
        expect(response.nextVariants[0]).toMatchObject({
            advisorGain: 1.5,
            advisorActions: ["Przenieś drif"],
            advisorKind: "MOVES",
        });
        expect(JSON.parse(response.baselineConstraintsSignature).characterStats).toEqual({
            Moc: 135,
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
        const cancellationToken = optimizeEquipmentDrifs.mock.calls[0][0].advisor.cancellationToken;
        await act(async () => {
            await result.current.cancelDrifOptimization();
        });
        expect(cancelAdvisorOptimization).toHaveBeenCalledWith({ runId, cancellationToken });
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

        await act(async () => {
            first = result.current.runDrifOptimization({
                mode: "ADVISOR",
                advisor: { goal: "TEST" },
            });
            second = result.current.runDrifOptimization({
                mode: "ADVISOR",
                advisor: { goal: "TEST" },
            });
            await Promise.resolve();
        });
        expect(optimizeEquipmentDrifs).toHaveBeenCalledTimes(1);
        const previousRunId = optimizeEquipmentDrifs.mock.calls[0][0].advisor.runId;
        const previousCancellationToken =
            optimizeEquipmentDrifs.mock.calls[0][0].advisor.cancellationToken;
        expect(cancelAdvisorOptimization).toHaveBeenCalledWith({
            runId: previousRunId,
            cancellationToken: previousCancellationToken,
        });

        await act(async () => {
            finishes[0]({ summary: { success: true } });
            await first;
        });
        expect(optimizeEquipmentDrifs).toHaveBeenCalledTimes(2);
        const newestRunId = optimizeEquipmentDrifs.mock.calls[1][0].advisor.runId;
        const newestCancellationToken =
            optimizeEquipmentDrifs.mock.calls[1][0].advisor.cancellationToken;
        await act(async () => result.current.cancelDrifOptimization());
        expect(cancelAdvisorOptimization).toHaveBeenCalledWith({
            runId: newestRunId,
            cancellationToken: newestCancellationToken,
        });

        await act(async () => {
            finishes[1]({ summary: { success: true } });
            await second;
        });
    });

    it("does not start a pending replacement after the user cancels it", async () => {
        let finishPreviousCancellation;
        let finishPreviousAnalysis;
        cancelAdvisorOptimization.mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    finishPreviousCancellation = resolve;
                })
        );
        optimizeEquipmentDrifs.mockImplementation(
            () =>
                new Promise((resolve) => {
                    finishPreviousAnalysis = resolve;
                })
        );
        const { result } = renderOptimization({ helmet: { itemId: 7 } });

        await act(async () => {
            void result.current.runDrifOptimization({
                mode: "ADVISOR",
                advisor: { goal: "TEST" },
            });
        });
        let replacement;
        await act(async () => {
            replacement = result.current.runDrifOptimization({
                mode: "ADVISOR",
                advisor: { goal: "TEST" },
            });
            await Promise.resolve();
        });

        await act(async () => {
            await result.current.cancelDrifOptimization();
            finishPreviousCancellation({ cancelled: true });
            finishPreviousAnalysis({
                summary: { success: true },
                advisorReport: { cancelled: true, plans: [] },
            });
        });

        await expect(replacement).resolves.toEqual({
            success: false,
            message: "Analiza Doradcy została anulowana.",
            applied: false,
        });
        expect(optimizeEquipmentDrifs).toHaveBeenCalledTimes(1);
    });
});
