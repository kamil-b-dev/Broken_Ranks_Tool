import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useOptimizerPriorities } from "./useOptimizerPriorities";

const gameRules = {
    bonusTranslations: { CRITICAL_CHANCE: "Szansa na krytyk", MANA_REGEN: "Regeneracja many" },
    drifBonusCategories: { CRITICAL_CHANCE: "OFFENSIVE", MANA_REGEN: "UTILITY" },
    drifBasePowers: { CRITICAL_CHANCE: 5, MANA_REGEN: 4 },
};

describe("useOptimizerPriorities", () => {
    it("hides categories independently without removing priorities, limits or expansion state", () => {
        const rules = {
            ...gameRules,
            drifBonusCategories: { ...gameRules.drifBonusCategories, ARMOR: "DEFENSIVE" },
        };
        const priorities = [
            { key: "MANA_REGEN", value: "Regeneracja many", weight: 30, min: 2, max: 4 },
            { key: "ARMOR", value: "Pancerz", weight: 20, min: 0, max: 2 },
            { key: "CRITICAL_CHANCE", value: "Szansa na krytyk", weight: 5, min: 1, max: 3 },
        ];
        const { result } = renderHook(() => useOptimizerPriorities(rules));
        act(() => result.current.replaceConfiguration({ priorities }));
        act(() => result.current.togglePriorityCategory("DEFENSIVE"));
        act(() => result.current.togglePriorityCategory("UTILITY"));
        expect(result.current.displayedPriorities.map(({ key }) => key)).toEqual([
            "CRITICAL_CHANCE",
        ]);
        expect(result.current.priorityCategoryCounts).toEqual({
            OFFENSIVE: 1,
            DEFENSIVE: 1,
            UTILITY: 1,
        });
        expect(result.current.prioritizedBonuses).toEqual(priorities);
        expect([...result.current.expandedPriorities]).toEqual(priorities.map(({ key }) => key));
        act(() => result.current.togglePriorityCategory("OFFENSIVE"));
        expect(result.current.displayedPriorities).toEqual([]);
        expect(result.current.prioritizedBonuses).toHaveLength(3);
        act(() => result.current.togglePriorityCategory("DEFENSIVE"));
        expect(result.current.displayedPriorities).toEqual([priorities[1]]);
        act(() => result.current.showAllPriorityCategories());
        expect(result.current.displayedPriorities).toEqual(priorities);
        expect(result.current.hiddenPriorityCategories.size).toBe(0);
    });

    it("keeps visibility filters when sorting or importing and does not hide unclassified modifiers", () => {
        const { result } = renderHook(() => useOptimizerPriorities(gameRules));
        act(() => result.current.togglePriorityCategory("OFFENSIVE"));
        act(() =>
            result.current.selectBonus(
                result.current.availableBonuses.find(({ key }) => key === "CRITICAL_CHANCE")
            )
        );
        expect(result.current.displayedPriorities).toEqual([]);
        const priorities = [
            { key: "MANA_REGEN", value: "Regeneracja many", weight: 10 },
            { key: "CRITICAL_CHANCE", value: "Szansa na krytyk", weight: 20 },
            { key: "UNKNOWN", value: "Nieznany", weight: 1 },
        ];
        act(() => result.current.replaceConfiguration({ priorities }));
        act(() => result.current.toggleCategorySorting());
        expect(result.current.displayedPriorities.map(({ key }) => key)).toEqual([
            "MANA_REGEN",
            "UNKNOWN",
        ]);
        act(() => result.current.sortByPriority());
        expect(result.current.hiddenPriorityCategories.has("OFFENSIVE")).toBe(true);
        act(() => result.current.togglePriorityCategory("UTILITY"));
        act(() => result.current.togglePriorityCategory("UNKNOWN"));
        expect(result.current.displayedPriorities.map(({ key }) => key)).toEqual(["UNKNOWN"]);
        expect(result.current.prioritizedBonuses).toHaveLength(3);
    });

    it("moves bonuses between available choices and configured priorities", () => {
        const { result } = renderHook(() => useOptimizerPriorities(gameRules));
        const criticalChance = result.current.availableBonuses.find(
            (bonus) => bonus.key === "CRITICAL_CHANCE"
        );

        act(() => result.current.selectBonus(criticalChance));

        expect(result.current.prioritizedBonuses).toHaveLength(1);
        expect(result.current.availableBonuses.map((bonus) => bonus.key)).not.toContain(
            "CRITICAL_CHANCE"
        );
        expect(result.current.expandedPriorities.has("CRITICAL_CHANCE")).toBe(true);

        act(() => result.current.removeBonus(result.current.prioritizedBonuses[0]));
        expect(result.current.prioritizedBonuses).toHaveLength(0);
        expect(result.current.availableBonuses.map((bonus) => bonus.key)).toContain(
            "CRITICAL_CHANCE"
        );
    });

    it("keeps mutually exclusive targets consistent", () => {
        const { result } = renderHook(() => useOptimizerPriorities(gameRules));
        act(() => result.current.selectBonus(result.current.availableBonuses[0]));
        const key = result.current.prioritizedBonuses[0].key;

        act(() => result.current.updateBonus(key, "forceCap", true));
        act(() => result.current.updateBonus(key, "forcePercentage", true));
        expect(result.current.prioritizedBonuses[0]).toMatchObject({
            forceCap: false,
            forcePercentage: true,
            maximize: false,
        });

        act(() => result.current.updateBonus(key, "maximize", true));
        expect(result.current.prioritizedBonuses[0]).toMatchObject({
            forcePercentage: false,
            maximize: true,
        });

        act(() => result.current.updateBonus(key, "forceCap", true));
        expect(result.current.prioritizedBonuses[0]).toMatchObject({
            forceCap: true,
            forcePercentage: false,
            maximize: false,
        });
        act(() => result.current.updateBonus(key, "maximize", true));
        expect(result.current.prioritizedBonuses[0]).toMatchObject({
            forceCap: false,
            forcePercentage: false,
            maximize: true,
        });
    });

    it("filters available bonuses and restores an imported configuration", () => {
        const { result } = renderHook(() => useOptimizerPriorities(gameRules));
        act(() => result.current.setSearchQuery("many"));
        expect(result.current.availableBonuses.map((bonus) => bonus.key)).toEqual(["MANA_REGEN"]);

        act(() =>
            result.current.replaceConfiguration({
                priorities: [{ key: "CRITICAL_CHANCE", value: "Szansa na krytyk" }],
            })
        );
        expect(result.current.expandedPriorities.has("CRITICAL_CHANCE")).toBe(true);
    });

    it("returns no choices before rules arrive and excludes bonuses without drif power", () => {
        const empty = renderHook(() => useOptimizerPriorities(null));
        expect(empty.result.current.availableBonuses).toEqual([]);

        const rules = {
            ...gameRules,
            bonusTranslations: { ...gameRules.bonusTranslations, ORB_ONLY: "Tylko orb" },
        };
        const { result } = renderHook(() => useOptimizerPriorities(rules));
        expect(result.current.availableBonuses.map((bonus) => bonus.key)).not.toContain("ORB_ONLY");
    });

    it("filters by category, updates regular fields and clears the configuration", () => {
        const { result } = renderHook(() => useOptimizerPriorities(gameRules));

        act(() => result.current.setSelectedCategory("UTILITY"));
        expect(result.current.availableBonuses.map((bonus) => bonus.key)).toEqual(["MANA_REGEN"]);
        act(() => result.current.selectBonus(result.current.availableBonuses[0]));
        act(() => result.current.updateBonus("MANA_REGEN", "weight", 27));
        expect(result.current.prioritizedBonuses[0].weight).toBe(27);
        act(() => result.current.clearAll());
        expect(result.current.prioritizedBonuses).toEqual([]);
        expect(result.current.expandedPriorities.size).toBe(0);
    });

    it("sorts priorities in both directions while keeping equal weights stable", () => {
        const { result } = renderHook(() => useOptimizerPriorities(gameRules));
        act(() =>
            result.current.replaceConfiguration({
                priorities: [
                    { key: "CRITICAL_CHANCE", weight: 5 },
                    { key: "MANA_REGEN", weight: 20 },
                ],
            })
        );

        act(() => result.current.sortByPriority());
        expect(result.current.prioritizedBonuses.map((bonus) => bonus.key)).toEqual([
            "MANA_REGEN",
            "CRITICAL_CHANCE",
        ]);
        expect(result.current.prioritySortDirection).toBe("asc");

        act(() => result.current.sortByPriority());
        expect(result.current.prioritizedBonuses.map((bonus) => bonus.key)).toEqual([
            "CRITICAL_CHANCE",
            "MANA_REGEN",
        ]);
    });

    it("toggles individual and all priority cards", () => {
        const { result } = renderHook(() => useOptimizerPriorities(gameRules));
        act(() =>
            result.current.replaceConfiguration({
                priorities: [{ key: "CRITICAL_CHANCE" }, { key: "MANA_REGEN" }],
            })
        );

        act(() => result.current.toggleExpanded("CRITICAL_CHANCE"));
        expect(result.current.expandedPriorities.has("CRITICAL_CHANCE")).toBe(false);
        act(() => result.current.toggleExpanded("CRITICAL_CHANCE"));
        expect(result.current.expandedPriorities.has("CRITICAL_CHANCE")).toBe(true);
        act(() => result.current.toggleAllExpanded());
        expect(result.current.expandedPriorities.size).toBe(0);
        act(() => result.current.toggleAllExpanded());
        expect(result.current.expandedPriorities.size).toBe(2);
    });

    it("sorts the displayed categories and names without changing configured weights, limits or order", () => {
        const rules = {
            ...gameRules,
            drifBonusCategories: { ...gameRules.drifBonusCategories, ARMOR: "DEFENSIVE" },
        };
        const priorities = [
            { key: "MANA_REGEN", value: "Regeneracja many", weight: 30, min: 2, max: 4 },
            { key: "CRITICAL_CHANCE", value: "Szansa na krytyk", weight: 5, min: 1, max: 3 },
            { key: "UNKNOWN_BONUS", value: "Nieznany", weight: 10, min: 0, max: 1 },
            { key: "ARMOR", value: "Pancerz", weight: 20, min: 0, max: 2 },
            { key: "DAMAGE_PHYSICAL", value: "Obrażenia fizyczne", weight: 1, min: 0, max: 6 },
        ];
        const { result } = renderHook(() => useOptimizerPriorities(rules));
        act(() => result.current.replaceConfiguration({ priorities }));
        act(() => result.current.toggleCategorySorting());

        expect(result.current.categorySorted).toBe(true);
        expect(result.current.displayedPriorities.map((bonus) => bonus.key)).toEqual([
            "DAMAGE_PHYSICAL",
            "CRITICAL_CHANCE",
            "ARMOR",
            "MANA_REGEN",
            "UNKNOWN_BONUS",
        ]);
        expect(result.current.prioritizedBonuses).toEqual(priorities);
        expect(
            result.current.displayedPriorities.find((bonus) => bonus.key === "MANA_REGEN")
        ).toMatchObject(priorities[0]);
        expect([...result.current.expandedPriorities]).toEqual(
            priorities.map((bonus) => bonus.key)
        );

        act(() => result.current.toggleCategorySorting());
        expect(result.current.categorySorted).toBe(false);
        expect(result.current.displayedPriorities).toEqual(priorities);
    });

    it("keeps new and imported priorities sorted until weight sorting is selected", () => {
        const rules = {
            ...gameRules,
            bonusTranslations: { ...gameRules.bonusTranslations, ARMOR: "Pancerz" },
            drifBonusCategories: { ...gameRules.drifBonusCategories, ARMOR: "DEFENSIVE" },
            drifBasePowers: { ...gameRules.drifBasePowers, ARMOR: 3 },
        };
        const { result } = renderHook(() => useOptimizerPriorities(rules));
        act(() => result.current.toggleCategorySorting());
        for (const key of ["MANA_REGEN", "ARMOR", "CRITICAL_CHANCE"]) {
            act(() =>
                result.current.selectBonus(
                    result.current.availableBonuses.find((bonus) => bonus.key === key)
                )
            );
        }
        expect(result.current.displayedPriorities.map((bonus) => bonus.key)).toEqual([
            "CRITICAL_CHANCE",
            "ARMOR",
            "MANA_REGEN",
        ]);
        act(() => result.current.updateBonus("MANA_REGEN", "weight", 30));
        act(() => result.current.updateBonus("CRITICAL_CHANCE", "min", 2));
        expect(result.current.displayedPriorities[0]).toMatchObject({
            key: "CRITICAL_CHANCE",
            min: 2,
        });
        const imported = [...result.current.prioritizedBonuses].reverse();
        act(() => result.current.replaceConfiguration({ priorities: imported }));
        expect(result.current.displayedPriorities.map((bonus) => bonus.key)).toEqual([
            "CRITICAL_CHANCE",
            "ARMOR",
            "MANA_REGEN",
        ]);
        act(() => result.current.sortByPriority());
        expect(result.current.categorySorted).toBe(false);
        expect(result.current.displayedPriorities).toEqual(result.current.prioritizedBonuses);
        expect(result.current.displayedPriorities[0].key).toBe("MANA_REGEN");
    });
});
