import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useOptimizerLabels } from "./useOptimizerLabels";
import { useOptimizerPriorities } from "./useOptimizerPriorities";
import { OPTIMIZER_LABEL_STORAGE_KEY } from "./optimizerLabels";

const rules = {
    bonusTranslations: { DAMAGE_MAGIC: "Obrażenia magiczne", CRITICAL_CHANCE: "Szansa na krytyk" },
    drifBasePowers: { DAMAGE_MAGIC: 3, CRITICAL_CHANCE: 4 },
    drifBonusCategories: { DAMAGE_MAGIC: "OFFENSIVE", CRITICAL_CHANCE: "OFFENSIVE" },
};
const drifs = [
    { name: "Abaf", bonusType: "DAMAGE_MAGIC" },
    { name: "Band", bonusType: "CRITICAL_CHANCE" },
];
describe("optimizer naming preference", () => {
    beforeEach(() => localStorage.clear());
    it("updates category ordering to displayed stone names without changing visibility or canonical data", () => {
        const catalog = [
            { name: "Zaf", bonusType: "DAMAGE_MAGIC" },
            { name: "Abaf", bonusType: "CRITICAL_CHANCE" },
        ];
        const { result } = renderHook(() => {
            const labels = useOptimizerLabels(rules, catalog);
            return { labels, priorities: useOptimizerPriorities(rules, labels) };
        });
        act(() =>
            result.current.priorities.replaceConfiguration({
                priorities: [
                    { key: "DAMAGE_MAGIC", value: "Obrażenia magiczne", weight: 5, min: 1, max: 2 },
                    {
                        key: "CRITICAL_CHANCE",
                        value: "Szansa na krytyk",
                        weight: 20,
                        min: 2,
                        max: 3,
                    },
                ],
            })
        );
        const original = structuredClone(result.current.priorities.prioritizedBonuses);
        act(() => result.current.priorities.toggleCategorySorting());
        expect(result.current.priorities.displayedPriorities.map(({ key }) => key)).toEqual([
            "DAMAGE_MAGIC",
            "CRITICAL_CHANCE",
        ]);
        act(() => result.current.priorities.togglePriorityCategory("OFFENSIVE"));
        act(() => result.current.labels.changeMode("DRIFS"));
        expect(result.current.priorities.displayedPriorities).toEqual([]);
        act(() => result.current.priorities.showAllPriorityCategories());
        expect(result.current.priorities.displayedPriorities.map(({ key }) => key)).toEqual([
            "CRITICAL_CHANCE",
            "DAMAGE_MAGIC",
        ]);
        expect(result.current.priorities.prioritizedBonuses).toEqual(original);
    });
    it("restores a common preference and rejects unsupported stored values", () => {
        localStorage.setItem(OPTIMIZER_LABEL_STORAGE_KEY, "INVALID");
        const first = renderHook(() => useOptimizerLabels(rules, drifs));
        expect(first.result.current.mode).toBe("MODIFIERS");
        act(() => first.result.current.changeMode("DRIFS"));
        first.unmount();
        const next = renderHook(() => useOptimizerLabels(rules, drifs));
        expect(next.result.current.mode).toBe("DRIFS");
        expect(next.result.current.getName("DAMAGE_MAGIC")).toBe("Abaf");
    });
    it("works in the current session when storage is unavailable", () => {
        const read = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
            throw new Error("Blocked");
        });
        const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
            throw new Error("Blocked");
        });
        try {
            const { result } = renderHook(() => useOptimizerLabels(rules, drifs));
            act(() => result.current.changeMode("DRIFS"));
            expect(result.current.getName("DAMAGE_MAGIC")).toBe("Abaf");
        } finally {
            read.mockRestore();
            write.mockRestore();
        }
    });
    it("searches both naming styles and keeps the actual priorities unchanged when switching names", () => {
        const { result } = renderHook(() => {
            const labels = useOptimizerLabels(rules, drifs);
            return { labels, priorities: useOptimizerPriorities(rules, labels) };
        });
        act(() => result.current.priorities.setSearchQuery("abaf"));
        expect(result.current.priorities.availableBonuses.map(({ key }) => key)).toEqual([
            "DAMAGE_MAGIC",
        ]);
        act(() =>
            result.current.priorities.selectBonus(result.current.priorities.availableBonuses[0])
        );
        const before = result.current.priorities.prioritizedBonuses;
        act(() => result.current.labels.changeMode("DRIFS"));
        expect(result.current.priorities.prioritizedBonuses).toEqual(before);
        expect(result.current.priorities.prioritizedBonuses[0].value).toBe("Obrażenia magiczne");
        act(() => result.current.priorities.setSearchQuery("krytyk"));
        expect(result.current.priorities.availableBonuses.map(({ key }) => key)).toEqual([
            "CRITICAL_CHANCE",
        ]);
    });
});
