import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useOptimizerPriorities } from "./useOptimizerPriorities";

const gameRules = {
    bonusTranslations: { CRITICAL_CHANCE: "Szansa na krytyk", MANA_REGEN: "Regeneracja many" },
    drifBonusCategories: { CRITICAL_CHANCE: "OFFENSIVE", MANA_REGEN: "UTILITY" },
    drifBasePowers: { CRITICAL_CHANCE: 5, MANA_REGEN: 4 },
};

describe("useOptimizerPriorities", () => {
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
});
