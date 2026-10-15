import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useOptimizerWorkspace } from "./useOptimizerWorkspace";
import { useEquipment } from "../../shared/state/EquipmentContext";
import { downloadOptimizerConfiguration } from "./optimizerConfigFiles";
import { readOptimizerDraft } from "../../app/storage/workingDraftStorage";

vi.mock("../../shared/state/EquipmentContext", () => ({ useEquipment: vi.fn() }));
vi.mock("./optimizerConfigFiles", () => ({
    downloadOptimizerConfiguration: vi.fn(),
    readOptimizerConfigurationFile: vi.fn(),
}));

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
        vi.clearAllMocks();
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

    it("preserves an in-flight response and the selected variant when display preferences change", async () => {
        equipment.data.drifs[0].name = "Band";
        let finish;
        equipment.runDrifOptimization.mockImplementation(
            () =>
                new Promise((resolve) => {
                    finish = resolve;
                })
        );
        const onSettingsChange = vi.fn();
        const { result } = renderHook(() =>
            useOptimizerWorkspace({
                optimizerSettings: { ...settings, configurationMode: "ADVANCED" },
                onOptimizerSettingsChange: onSettingsChange,
            })
        );
        act(() => result.current.selectBonus(result.current.availableBonuses[0]));
        const original = structuredClone(equipment.requestData);
        const invalidations = equipment.invalidateDrifOptimization.mock.calls.length;
        let running;
        act(() => {
            running = result.current.handleOptimizeClick();
        });
        expect(result.current.isOptimizing).toBe(true);
        act(() => {
            result.current.labels.changeMode("DRIFS");
            result.current.togglePriorityCategory("OFFENSIVE");
            result.current.toggleCategorySorting();
        });
        expect(result.current.isOptimizing).toBe(true);
        expect(result.current.displayedPriorities).toEqual([]);
        expect(equipment.runDrifOptimization).toHaveBeenCalledTimes(1);
        expect(equipment.invalidateDrifOptimization).toHaveBeenCalledTimes(invalidations);
        const response = {
            success: true,
            goalResults: [{ statKey: "CRITICAL_CHANCE", bonusName: "Krytyk", placedCount: 4 }],
            nextVariants: [{ setup: { slots: slots(2) } }, { setup: { slots: slots(4) } }],
        };
        await act(async () => {
            finish(response);
            await running;
        });
        expect(result.current.optimizationStatus.goalResults).toEqual(response.goalResults);
        expect(result.current.isOptimizing).toBe(false);
        act(() => result.current.setActiveVariantIndex(1));
        act(() => {
            result.current.labels.changeMode("MODIFIERS");
            result.current.showAllPriorityCategories();
        });
        expect(result.current.activeVariantIndex).toBe(1);
        expect(result.current.reportModDetails[0].count).toBe(4);
        expect(equipment.requestData).toEqual(original);
        expect(equipment.invalidateDrifOptimization).toHaveBeenCalledTimes(invalidations);
    });

    it("exports and saves every hidden priority using canonical identifiers and original limits", async () => {
        equipment.data.drifs[0].name = "Band";
        const { result } = renderHook(() =>
            useOptimizerWorkspace({
                optimizerSettings: { ...settings, configurationMode: "ADVANCED" },
                onOptimizerSettingsChange: vi.fn(),
            })
        );
        act(() => result.current.selectBonus(result.current.availableBonuses[0]));
        act(() => {
            result.current.updateBonus("CRITICAL_CHANCE", "weight", 24);
            result.current.updateBonus("CRITICAL_CHANCE", "min", 3);
            result.current.updateBonus("CRITICAL_CHANCE", "max", 6);
            result.current.updateBonus("CRITICAL_CHANCE", "sizeRanges", {
                SUBDRIF: { min: 2, max: 4 },
            });
            result.current.labels.changeMode("DRIFS");
            result.current.togglePriorityCategory("OFFENSIVE");
        });
        expect(result.current.displayedPriorities).toHaveLength(0);
        act(() => result.current.configFiles.save());
        const exported = downloadOptimizerConfiguration.mock.calls[0][0];
        const expected = {
            key: "CRITICAL_CHANCE",
            weight: 24,
            min: 3,
            max: 6,
            sizeRanges: { SUBDRIF: { min: 2, max: 4 } },
        };
        expect(exported.priorities).toMatchObject([expected]);
        expect(JSON.stringify(exported)).not.toMatch(/Band|hiddenPriorityCategories|DRIFS/);
        await waitFor(() => expect(readOptimizerDraft()?.priorities).toMatchObject([expected]));
    });

    it.each([
        ["forcePercentage", true, "Podaj poprawny, nieujemny procent dla: Krytyk."],
        [
            "sizeRanges",
            { SUBDRIF: { min: 4, max: 2 } },
            "Zakresy rozmiarów są nieprawidłowe lub sprzeczne z łącznym limitem dla: Krytyk.",
        ],
    ])(
        "still rejects invalid %s settings that belong to hidden categories",
        async (field, value, message) => {
            const { result } = renderHook(() =>
                useOptimizerWorkspace({
                    optimizerSettings: { ...settings, configurationMode: "ADVANCED" },
                    onOptimizerSettingsChange: vi.fn(),
                })
            );
            act(() => result.current.selectBonus(result.current.availableBonuses[0]));
            act(() => {
                result.current.updateBonus("CRITICAL_CHANCE", field, value);
                result.current.togglePriorityCategory("OFFENSIVE");
            });
            await act(async () => result.current.handleOptimizeClick());
            expect(result.current.notice).toMatchObject({
                type: "error",
                message,
            });
            expect(equipment.runDrifOptimization).not.toHaveBeenCalled();
        }
    );
});
