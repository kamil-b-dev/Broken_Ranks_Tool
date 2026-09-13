import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    downloadOptimizerConfiguration,
    readOptimizerConfigurationFile,
} from "./optimizerConfigFiles";
import { useOptimizerConfigFiles } from "./useOptimizerConfigFiles";

vi.mock("./optimizerConfigFiles", () => ({
    downloadOptimizerConfiguration: vi.fn(),
    readOptimizerConfigurationFile: vi.fn(),
}));

const gameRules = {
    bonusTranslations: { CRITICAL_CHANCE: "Szansa na krytyk" },
    drifBasePowers: { CRITICAL_CHANCE: 4 },
    drifBonusCategories: { CRITICAL_CHANCE: "OFFENSIVE" },
};

const validPayload = {
    format: "broken-ranks-tool-optimizer-config",
    version: 1,
    settings: {
        mode: "ADVISOR",
        maxVariantLossPercent: 25,
        advisorProfession: "PHYSICAL",
        advisorGoal: "DAMAGE",
        advisorSearch: { targetMode: "GAIN", target: 15, maxActions: 2, timeBudgetMs: 5000 },
        advisorProtectedModifiers: { CRITICAL_CHANCE: true },
        advisorAllowedChanges: { items: true, drifs: false, orbs: false },
    },
    priorities: [{ key: "CRITICAL_CHANCE", weight: 10 }],
};

describe("useOptimizerConfigFiles", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubGlobal("alert", vi.fn());
    });

    afterEach(() => vi.unstubAllGlobals());

    it("exports the current normalized configuration", () => {
        const priorities = [{ key: "CRITICAL_CHANCE", weight: 10 }];
        const settings = { mode: "BUILD_FROM_SCRATCH", maxVariantLossPercent: 10 };
        const { result } = renderHook(() =>
            useOptimizerConfigFiles({
                priorities,
                settings,
                gameRules,
                replaceConfiguration: vi.fn(),
                onSettingsChange: vi.fn(),
            })
        );

        act(() => result.current.save());

        expect(downloadOptimizerConfiguration).toHaveBeenCalledWith(
            expect.objectContaining({
                format: "broken-ranks-tool-optimizer-config",
                priorities: [expect.objectContaining({ key: "CRITICAL_CHANCE" })],
            })
        );
    });

    it("imports priorities and merges all persisted settings", async () => {
        readOptimizerConfigurationFile.mockResolvedValue(validPayload);
        const replaceConfiguration = vi.fn();
        const onSettingsChange = vi.fn();
        const { result } = renderHook(() =>
            useOptimizerConfigFiles({
                priorities: [],
                settings: {},
                gameRules,
                replaceConfiguration,
                onSettingsChange,
            })
        );
        const input = { files: [{ name: "config.json" }], value: "selected" };

        await act(() => result.current.load({ target: input }));

        expect(input.value).toBe("");
        expect(replaceConfiguration).toHaveBeenCalledWith(
            expect.objectContaining({
                priorities: [expect.objectContaining({ key: "CRITICAL_CHANCE" })],
            })
        );
        const update = onSettingsChange.mock.calls[0][0];
        expect(update({ untouched: true })).toMatchObject({
            untouched: true,
            mode: "ADVISOR",
            maxVariantLossPercent: 25,
            advisorProfession: "PHYSICAL",
            advisorGoal: "DAMAGE",
            advisorSearch: { targetMode: "GAIN", target: 15, maxActions: 2, timeBudgetMs: 5000 },
            advisorProtectedModifiers: { CRITICAL_CHANCE: true },
            advisorAllowedChanges: expect.objectContaining({ items: true, drifs: false }),
        });
        expect(alert).toHaveBeenCalledWith("Wczytano konfigurację: 1 priorytetów.");
    });

    it("ignores an empty file input and reports specific and generic failures", async () => {
        const { result } = renderHook(() =>
            useOptimizerConfigFiles({
                priorities: [],
                settings: {},
                gameRules,
                replaceConfiguration: vi.fn(),
                onSettingsChange: vi.fn(),
            })
        );

        await act(() => result.current.load({ target: { files: [], value: "" } }));
        expect(readOptimizerConfigurationFile).not.toHaveBeenCalled();

        readOptimizerConfigurationFile.mockRejectedValueOnce(
            new Error("Plik konfiguracji jest zbyt duży.")
        );
        await act(() => result.current.load({ target: { files: [{}], value: "selected" } }));
        expect(alert).toHaveBeenLastCalledWith("Plik konfiguracji jest zbyt duży.");

        readOptimizerConfigurationFile.mockRejectedValueOnce({});
        await act(() => result.current.load({ target: { files: [{}], value: "selected" } }));
        expect(alert).toHaveBeenLastCalledWith(
            "Nie udało się wczytać konfiguracji: niepoprawny plik JSON."
        );
    });
});
