import { describe, expect, it } from "vitest";
import {
    calculateDrifValue,
    createBonusOption,
    getDrifPenaltyMultiplier,
    highestLevelForCapacity,
    maxDrifSizeIndexForTier,
    numericStatValue,
    parsePercentage,
    sortBonusesByCategory,
} from "./optimizerDomain";

describe("optimizerDomain", () => {
    it("uses backend penalty multipliers and preserves the legacy fallback", () => {
        expect(getDrifPenaltyMultiplier(4, { 4: 0.91 })).toBe(0.91);
        expect(getDrifPenaltyMultiplier(3)).toBe(1);
        expect(getDrifPenaltyMultiplier(8)).toBe(0.69);
        expect(getDrifPenaltyMultiplier(12)).toBe(0.5);
    });

    it("categorizes and orders translated bonuses", () => {
        const bonuses = [
            createBonusOption(["MANA_REGEN", "Regeneracja many"]),
            createBonusOption(["CRITICAL_CHANCE", "Szansa na krytyk"]),
            createBonusOption(["CC_PROTECTION", "Odporność"]),
        ];

        expect(sortBonusesByCategory(bonuses).map(({ key }) => key)).toEqual([
            "CRITICAL_CHANCE",
            "CC_PROTECTION",
            "MANA_REGEN",
        ]);
    });

    it("parses localized values and applies doubled high-level increments", () => {
        expect(parsePercentage("+12,5%")).toBe(12.5);
        expect(numericStatValue("+42,75%")).toBe(42.75);
        expect(calculateDrifValue({ baseValue: "5%", increment: "1%" }, 20)).toBe(26);
    });

    it("respects tier size limits and item capacity", () => {
        expect(maxDrifSizeIndexForTier(3)).toBe(0);
        expect(maxDrifSizeIndexForTier(7)).toBe(2);
        expect(maxDrifSizeIndexForTier(12)).toBe(3);
        expect(highestLevelForCapacity({ size: "ARCYDRIF" }, 20, 10)).toBe(11);
        expect(highestLevelForCapacity({ size: "BIDRIF" }, 100, 10)).toBe(11);
    });
});
