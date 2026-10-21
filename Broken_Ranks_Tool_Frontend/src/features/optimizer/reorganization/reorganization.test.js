import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createEquipmentOptimizationRequest } from "../equipmentOptimizationRequest";
import {
    buildOptimizationConfig,
    createOptimizerConfigPayload,
    parseOptimizerConfigPayload,
} from "../optimizerConfiguration";
import { useEquipmentOptimization } from "../useEquipmentOptimization";
import { optimizeEquipmentDrifs } from "../../../shared/api/equipmentApi";
import { builderCatalog } from "../../../test/fixtures/equipment/builderCatalog";

vi.mock("../../../shared/api/equipmentApi", () => ({
    optimizeEquipmentDrifs: vi.fn(),
    cancelAdvisorOptimization: vi.fn(),
}));
afterEach(() => vi.clearAllMocks());

const config = {
    mode: "REORGANIZE",
    configurationMode: "SIMPLE",
    backpackOnly: true,
    generateVariants: true,
    forceMaximizationByDrifBonus: true,
};
const priority = { key: "CRITICAL_CHANCE", weight: 15, min: 0, max: 2, maximize: true };
const stone = { id: "owned", kind: "DRIF", templateId: "60", level: 6, sendToBackend: true };
const slot = (ids = [], levels = {}) => ({
    itemId: 1,
    itemStars: 1,
    orbIds: [],
    orbLevels: [],
    drifIds: ids,
    drifLevels: levels,
});

describe("reorganization workflow", () => {
    it("persists the mode and uses shared advanced goals without leaking inactive options", () => {
        const payload = createOptimizerConfigPayload([priority], config);
        expect(parseOptimizerConfigPayload(payload, builderCatalog.gameRules).mode).toBe(
            "REORGANIZE"
        );
        const effective = buildOptimizationConfig([priority], config);
        expect(effective).toMatchObject({
            mode: "REORGANIZE",
            configurationMode: "ADVANCED",
            priorities: { CRITICAL_CHANCE: 15 },
            generateVariants: false,
            forceMaximizationByDrifBonus: false,
        });
        expect(effective.backpackOnly).toBeUndefined();
        const request = createEquipmentOptimizationRequest({
            slots: { helmet: slot() },
            configuration: config,
            backpack: [stone, { ...stone, id: "unselected", sendToBackend: false }],
        });
        expect(request.configurationMode).toBe("ADVANCED");
        expect(request.backpackDrifs).toEqual([{ id: "owned", templateId: 60, level: 6 }]);
        expect(request.backpackOnly).toBeUndefined();
        expect(request.backpackSlotCount).toBe(2);
        expect(request.simpleProfile).toBeUndefined();
    });

    const props = () => ({
        requestData: { slots: { helmet: slot([60], { 0: 2 }) } },
        backpack: [stone],
        lockedSlots: [],
        lockedDrifs: {},
        data: builderCatalog,
        gameRules: builderCatalog.gameRules,
        setRequestData: vi.fn(),
        setBackpack: vi.fn(),
        restoreStats: vi.fn(),
    });
    const response = () => ({
        optimizedSetup: { slots: { helmet: slot([60], { 0: 6 }) } },
        summary: { success: true, outcome: "VALID_BUILD" },
        reorganizationDrifUsages: [
            {
                entryId: "owned",
                sourceSlotKey: null,
                sourceDrifIndex: null,
                slotKey: "helmet",
                drifIndex: 0,
            },
        ],
        calculationResult: { stats: { CRITICAL_CHANCE: "9%" } },
    });

    it("undoes equipment and backpack together and refuses to overwrite later edits", async () => {
        const input = props();
        optimizeEquipmentDrifs.mockResolvedValue(response());
        const { result, rerender } = renderHook((value) => useEquipmentOptimization(value), {
            initialProps: input,
        });
        await act(async () => result.current.runDrifOptimization(config));
        const applied = {
            ...input,
            requestData: input.setRequestData.mock.calls.at(-1)[0],
            backpack: input.setBackpack.mock.calls.at(-1)[0],
        };
        rerender(applied);
        expect(result.current.canUndoReorganization).toBe(true);
        expect(result.current.reorganizationUndoWarning).toBeNull();
        rerender({ ...applied, backpack: [] });
        expect(result.current.reorganizationUndoWarning).toMatch(/Cofnięcie/);
        const beforeCalls = input.setBackpack.mock.calls.length;
        expect(() => result.current.undoReorganization()).toThrow(/nadpisałoby/);
        expect(input.setBackpack).toHaveBeenCalledTimes(beforeCalls);
        rerender(applied);
        act(() => expect(result.current.undoReorganization()).toBe(true));
        expect(input.setRequestData).toHaveBeenLastCalledWith(input.requestData);
        expect(input.setBackpack).toHaveBeenLastCalledWith(input.backpack);
        expect(input.restoreStats).toHaveBeenLastCalledWith(null);
        expect(result.current.canUndoReorganization).toBe(false);
        expect(result.current.undoReorganization()).toBe(false);
    });

    it.each([
        [
            "equipment",
            (applied) => ({ requestData: { ...applied.requestData, characterStats: { Moc: 42 } } }),
        ],
        ["item locks", () => ({ lockedSlots: ["helmet"] })],
        ["stone locks", () => ({ lockedDrifs: { helmet: [0] } })],
        ["catalog", (applied) => ({ data: { ...applied.data } })],
        ["game rules", (applied) => ({ gameRules: { ...applied.gameRules } })],
    ])("refuses undo after changing %s without updating either inventory", async (_, change) => {
        const input = props();
        optimizeEquipmentDrifs.mockResolvedValue(response());
        const { result, rerender } = renderHook((value) => useEquipmentOptimization(value), {
            initialProps: input,
        });
        await act(async () => result.current.runDrifOptimization(config));
        const applied = {
            ...input,
            requestData: input.setRequestData.mock.calls.at(-1)[0],
            backpack: input.setBackpack.mock.calls.at(-1)[0],
        };
        rerender(applied);
        expect(result.current.reorganizationUndoWarning).toBeNull();
        input.setRequestData.mockClear();
        input.setBackpack.mockClear();
        input.restoreStats.mockClear();
        rerender({ ...applied, ...change(applied) });
        expect(result.current.reorganizationUndoWarning).toMatch(/Cofnięcie nadpisałoby/);
        expect(() => result.current.undoReorganization()).toThrow(/Cofnięcie nadpisałoby/);
        expect(input.setRequestData).not.toHaveBeenCalled();
        expect(input.setBackpack).not.toHaveBeenCalled();
        expect(input.restoreStats).not.toHaveBeenCalled();
    });

    it("invalidates an in-flight response when undo is used before React publishes the restored input", async () => {
        const input = props();
        optimizeEquipmentDrifs.mockResolvedValueOnce(response());
        const { result, rerender } = renderHook((value) => useEquipmentOptimization(value), {
            initialProps: input,
        });
        await act(async () => result.current.runDrifOptimization(config));
        rerender({
            ...input,
            requestData: input.setRequestData.mock.calls.at(-1)[0],
            backpack: input.setBackpack.mock.calls.at(-1)[0],
        });
        let resolve;
        optimizeEquipmentDrifs.mockReturnValueOnce(
            new Promise((done) => {
                resolve = done;
            })
        );
        let pending;
        act(() => {
            pending = result.current.runDrifOptimization(config);
        });
        input.setRequestData.mockClear();
        input.setBackpack.mockClear();
        act(() => expect(result.current.undoReorganization()).toBe(true));
        // Keep the old props until the pending callback returns: the run token must protect undo too.
        const stale = {
            ...response(),
            reorganizationDrifUsages: [
                { sourceSlotKey: "helmet", sourceDrifIndex: 0, slotKey: "helmet", drifIndex: 0 },
            ],
        };
        await act(async () => {
            resolve(stale);
            expect(await pending).toMatchObject({ applied: false });
        });
        expect(input.setRequestData).toHaveBeenCalledExactlyOnceWith(input.requestData);
        expect(input.setBackpack).toHaveBeenCalledExactlyOnceWith(input.backpack);
    });

    it("restores a detached snapshot even if the old input objects are subsequently mutated", async () => {
        const input = props();
        const original = structuredClone({
            requestData: input.requestData,
            backpack: input.backpack,
        });
        optimizeEquipmentDrifs.mockResolvedValueOnce(response());
        const { result, rerender } = renderHook((value) => useEquipmentOptimization(value), {
            initialProps: input,
        });
        await act(async () => result.current.runDrifOptimization(config));
        rerender({
            ...input,
            requestData: input.setRequestData.mock.calls.at(-1)[0],
            backpack: input.setBackpack.mock.calls.at(-1)[0],
        });
        input.requestData.slots.helmet.drifLevels[0] = 1;
        input.backpack[0] = { ...stone, level: 1 };
        act(() => expect(result.current.undoReorganization()).toBe(true));
        expect(input.setRequestData).toHaveBeenLastCalledWith(original.requestData);
        expect(input.setBackpack).toHaveBeenLastCalledWith(original.backpack);
        expect(input.setRequestData.mock.calls.at(-1)[0]).not.toBe(original.requestData);
    });

    it("applies a verified pool result and returns the unused equipped stone", async () => {
        const input = props();
        optimizeEquipmentDrifs.mockResolvedValue(response());
        const { result } = renderHook(() => useEquipmentOptimization(input));
        await act(async () =>
            expect(await result.current.runDrifOptimization(config)).toMatchObject({
                applied: true,
            })
        );
        expect(input.setRequestData).toHaveBeenCalledWith({
            slots: { helmet: slot([60], { 0: 6 }) },
            characterStats: {},
        });
        expect(input.setBackpack.mock.calls[0][0]).toEqual([
            expect.objectContaining({ templateId: "60", level: 2 }),
        ]);
        expect(input.restoreStats).toHaveBeenCalled();
    });
    it("rejects a malformed result before changing either inventory", async () => {
        const input = props();
        optimizeEquipmentDrifs.mockResolvedValue({ ...response(), reorganizationDrifUsages: [] });
        const { result } = renderHook(() => useEquipmentOptimization(input));
        await act(async () =>
            expect(await result.current.runDrifOptimization(config)).toMatchObject({
                applied: false,
            })
        );
        expect(input.setBackpack).not.toHaveBeenCalled();
        expect(input.setRequestData).not.toHaveBeenCalled();
    });
    it("invalidates a pending result after a backpack change", async () => {
        let resolve;
        optimizeEquipmentDrifs.mockReturnValue(
            new Promise((done) => {
                resolve = done;
            })
        );
        const input = props();
        const { result, rerender } = renderHook((value) => useEquipmentOptimization(value), {
            initialProps: input,
        });
        let pending;
        act(() => {
            pending = result.current.runDrifOptimization(config);
        });
        rerender({ ...input, backpack: [{ ...stone, level: 5 }] });
        await act(async () => {
            resolve(response());
            expect(await pending).toMatchObject({ applied: false });
        });
        expect(input.setBackpack).not.toHaveBeenCalled();
        expect(input.setRequestData).not.toHaveBeenCalled();
    });

    it.each([
        [
            "equipment",
            (input) => ({ ...input, requestData: { slots: { helmet: slot([60], { 0: 4 }) } } }),
        ],
        [
            "character stats",
            (input) => ({
                ...input,
                requestData: { ...input.requestData, characterStats: { Moc: 150 } },
            }),
        ],
        ["slot lock", (input) => ({ ...input, lockedSlots: ["helmet"] })],
        ["socket lock", (input) => ({ ...input, lockedDrifs: { helmet: [0] } })],
        [
            "backpack selection",
            (input) => ({ ...input, backpack: [{ ...stone, sendToBackend: false }] }),
        ],
    ])("rejects a pending response after changing %s", async (_name, change) => {
        let resolve;
        optimizeEquipmentDrifs.mockReturnValue(
            new Promise((done) => {
                resolve = done;
            })
        );
        const input = props();
        const { result, rerender } = renderHook((value) => useEquipmentOptimization(value), {
            initialProps: input,
        });
        let pending;
        act(() => {
            pending = result.current.runDrifOptimization(config);
        });
        rerender(change(input));
        await act(async () => {
            resolve(response());
            expect(await pending).toMatchObject({
                applied: false,
                success: false,
                nextVariants: [],
            });
        });
        expect(input.setBackpack).not.toHaveBeenCalled();
        expect(input.setRequestData).not.toHaveBeenCalled();
        expect(input.restoreStats).not.toHaveBeenCalled();
    });

    it("applies a valid build with unmet soft targets while keeping the warning", async () => {
        const input = props();
        const value = response();
        value.summary = {
            success: false,
            outcome: "VALID_BUILD_SOFT_TARGETS_UNMET",
            warnings: ["Nie osiągnięto capa."],
        };
        optimizeEquipmentDrifs.mockResolvedValue(value);
        const { result } = renderHook(() => useEquipmentOptimization(input));
        await act(async () =>
            expect(await result.current.runDrifOptimization(config)).toMatchObject({
                applied: true,
                success: false,
                warnings: ["Nie osiągnięto capa."],
            })
        );
        expect(input.setBackpack).toHaveBeenCalledOnce();
        expect(input.setRequestData).toHaveBeenCalledOnce();
    });

    it.each(["INVALID_INPUT", "NO_BUILD_FOUND"])(
        "does not apply a %s response even if it contains a setup",
        async (outcome) => {
            const input = props();
            optimizeEquipmentDrifs.mockResolvedValue({
                ...response(),
                summary: { success: false, outcome },
            });
            const { result } = renderHook(() => useEquipmentOptimization(input));
            await act(async () =>
                expect(await result.current.runDrifOptimization(config)).toMatchObject({
                    applied: false,
                })
            );
            expect(input.setBackpack).not.toHaveBeenCalled();
            expect(input.setRequestData).not.toHaveBeenCalled();
            expect(input.restoreStats).not.toHaveBeenCalled();
        }
    );
});
