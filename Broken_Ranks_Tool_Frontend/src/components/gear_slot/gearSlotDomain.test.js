import { describe, expect, it } from "vitest";
import {
    calculateItemCapacity,
    calculateMaximumDrifSizeIndex,
    calculateMaximumDrifSlots,
    calculateUsedDrifPower,
    createImportedGearSlotState,
    getEffectiveDrifMultiplier,
    groupGearOptionsByType,
} from "./gearSlotDomain";

describe("gearSlotDomain", () => {
    it("maps drif levels to capacity multipliers", () => {
        expect([1, 6, 7, 11, 12, 16, 17, 21].map(getEffectiveDrifMultiplier)).toEqual([
            1, 1, 2, 2, 3, 3, 4, 4,
        ]);
    });

    it("calculates slot count, size, and star capacity rules", () => {
        expect(
            calculateMaximumDrifSlots({ hasItem: true, isEpicOrSet: false, tier: 3, stars: 7 })
        ).toBe(2);
        expect(
            calculateMaximumDrifSlots({ hasItem: true, isEpicOrSet: true, tier: 12, stars: 9 })
        ).toBe(0);
        expect(calculateMaximumDrifSizeIndex({ hasItem: true, isEpicOrSet: false, tier: 7 })).toBe(
            2
        );
        expect(calculateItemCapacity({ capacity: 20 }, 9)).toBe(24);
    });

    it("calculates used power from drif types and effective levels", () => {
        expect(
            calculateUsedDrifPower({
                selectedDrifs: [1, 2, ""],
                drifs: [
                    { id: 1, bonusType: "A" },
                    { id: 2, bonusType: "B" },
                ],
                basePowers: { A: 3, B: 5 },
                levels: { 0: 6, 1: 17 },
            })
        ).toBe(23);
    });

    it("groups options by their first available display type", () => {
        const grouped = groupGearOptionsByType([
            { id: 1, name: "Krytyk" },
            { id: 2, description: "Krytyk" },
            { id: 3, bonusType: "MANA" },
            { id: 4 },
        ]);

        expect(Object.keys(grouped)).toEqual(["Krytyk", "MANA"]);
        expect(grouped.Krytyk).toHaveLength(2);
    });

    it("converts persisted slot identifiers and levels to editor state", () => {
        const state = createImportedGearSlotState(
            {
                itemId: 7,
                itemStars: 8,
                orbIds: [2],
                orbLevels: [4],
                drifIds: [3, null],
                drifLevels: { 0: 12 },
            },
            [{ id: 2, name: "Orb krytyczny" }],
            [{ id: 3, description: "Drif krytyczny" }]
        );

        expect(state).toEqual({
            selectedItem: "7",
            itemStars: 8,
            orbSlots: {
                orb1: { id: "2", level: "4", type: "Orb krytyczny" },
                orb2: { id: "", level: "", type: "" },
            },
            selectedDrifs: ["3", ""],
            drifTypes: { 0: "Drif krytyczny" },
            drifLevels: { 0: 12 },
        });
    });

    it("creates an empty editor state for a removed slot", () => {
        expect(createImportedGearSlotState(null, [], [])).toMatchObject({
            selectedItem: "",
            itemStars: 1,
            selectedDrifs: [],
            drifTypes: {},
            drifLevels: {},
        });
    });
});
