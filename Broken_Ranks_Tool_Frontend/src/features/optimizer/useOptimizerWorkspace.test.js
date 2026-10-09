import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useOptimizerWorkspace } from "./useOptimizerWorkspace";
import { useEquipment } from "../../shared/state/EquipmentContext";

vi.mock("../../shared/state/EquipmentContext", () => ({ useEquipment: vi.fn() }));

describe("optimizer report and run invalidation", () => {
    const slots = (amount) =>
        Object.fromEntries(
            ["helmet", "armor", "cape", "boots"]
                .slice(0, amount)
                .map((key, index) => [key, { itemId: index + 1, drifIds: [10] }])
        );
    let equipment;
    const settings = {
        mode: "BUILD_FROM_SCRATCH",
        configurationMode: "SIMPLE",
        simpleProfile: "FIRE_MAGE",
    };
    beforeEach(() => {
        localStorage.clear();
        equipment = {
            gameRules: {
                bonusTranslations: { CRITICAL_CHANCE: "Krytyk" },
                drifBasePowers: { CRITICAL_CHANCE: 4 },
                drifPenaltyMultipliers: { 4: 0.95, 6: 0.8 },
            },
            drifCategories: {},
            requestData: { slots: slots(4) },
            data: { items: [], drifs: [{ id: 10, bonusType: "CRITICAL_CHANCE" }] },
            lockedSlots: [],
            lockedDrifs: {},
            invalidateDrifOptimization: vi.fn(),
            runDrifOptimization: vi.fn().mockResolvedValue({
                success: true,
                goalResults: [{ statKey: "CRITICAL_CHANCE", placedCount: 6 }],
                nextVariants: [{ setup: { slots: slots(2) } }, { setup: { slots: slots(4) } }],
            }),
        };
        useEquipment.mockReturnValue(equipment);
    });
    it("calculates repetition penalty from the selected report variant", async () => {
        const { result } = renderHook(() =>
            useOptimizerWorkspace({
                optimizerSettings: settings,
                onOptimizerSettingsChange: vi.fn(),
            })
        );
        await act(async () => result.current.handleOptimizeClick());
        expect(result.current.reportModDetails[0].count).toBe(2);
        expect(result.current.reportModDetails[0].penaltyPercent).toBe(0);
        act(() => result.current.setActiveVariantIndex(1));
        expect(result.current.reportModDetails[0].count).toBe(4);
        expect(result.current.reportModDetails[0].penaltyPercent).toBeCloseTo(5);
    });
    it("invalidates setup application as well as the report when configuration mode changes", async () => {
        const { result, rerender } = renderHook(
            ({ optimizerSettings }) =>
                useOptimizerWorkspace({ optimizerSettings, onOptimizerSettingsChange: vi.fn() }),
            { initialProps: { optimizerSettings: settings } }
        );
        await act(async () => result.current.handleOptimizeClick());
        expect(result.current.optimizationStatus).not.toBeNull();
        const previous = equipment.invalidateDrifOptimization.mock.calls.length;
        rerender({ optimizerSettings: { ...settings, configurationMode: "ADVANCED" } });
        expect(equipment.invalidateDrifOptimization).toHaveBeenCalledTimes(previous + 1);
        expect(result.current.optimizationStatus).toBeNull();
    });
});
