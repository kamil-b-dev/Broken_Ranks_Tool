import { describe, expect, it } from "vitest";
import {
    calculateDrifValue,
    calculateCurrentModDetails,
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

    it("calculates occupied counts and achievable ranges from eligible equipment", () => {
        const [details] = calculateCurrentModDetails({
            prioritizedBonuses: [{ key: "CRITICAL_CHANCE", min: 1, max: 3 }],
            slots: {
                helmet: { itemId: 1, itemStars: 7, drifIds: [10, 11] },
                armor: { itemId: 2, itemStars: 1, drifIds: [] },
            },
            drifs: [
                {
                    id: 10,
                    bonusType: "CRITICAL_CHANCE",
                    size: "SUBDRIF",
                    baseValue: "5%",
                    increment: "1%",
                },
                {
                    id: 11,
                    bonusType: "CRITICAL_CHANCE",
                    size: "SUBDRIF",
                    baseValue: "5%",
                    increment: "1%",
                },
            ],
            items: [
                {
                    id: 1,
                    tier: "IV",
                    rarity: "COMMON",
                    capacity: 10,
                    stats: { "Bonus drify": 5 },
                },
                { id: 2, tier: "X", rarity: "EPIC", capacity: 100, stats: {} },
            ],
            gameRules: {
                drifBasePowers: { CRITICAL_CHANCE: 5 },
                drifPenaltyMultipliers: { 1: 1 },
            },
        });

        expect(details.count).toBe(1);
        expect(details.potentialMinimumCount).toBe(1);
        expect(details.potentialMaximumCount).toBe(1);
        expect(details.potentialMinimum).toBeGreaterThan(0);
        expect(details.potentialMaximum).toBeGreaterThanOrEqual(details.potentialMinimum);
    });

    it("restricts elemental modifiers to weapons", () => {
        const [details] = calculateCurrentModDetails({
            prioritizedBonuses: [{ key: "DAMAGE_FIRE", min: 1, max: 2 }],
            slots: {
                helmet: { itemId: 1, drifIds: [] },
                weapon: { itemId: 2, drifIds: [] },
            },
            drifs: [
                {
                    id: 10,
                    bonusType: "DAMAGE_FIRE",
                    size: "SUBDRIF",
                    baseValue: "2%",
                    increment: "1%",
                },
            ],
            items: [
                { id: 1, tier: "X", rarity: "COMMON", capacity: 10, stats: {} },
                { id: 2, tier: "X", rarity: "COMMON", capacity: 10, stats: {} },
            ],
            gameRules: { drifBasePowers: { DAMAGE_FIRE: 5 } },
        });

        expect(details.potentialMaximumCount).toBe(1);
    });
});
