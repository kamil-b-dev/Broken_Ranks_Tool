import { describe, expect, it } from "vitest";
import {
    calculateItemCapacity,
    calculateMaximumDrifSizeIndex,
    calculateMaximumDrifSlots,
    calculateMaximumOrbSizeIndex,
    calculateUsedDrifPower,
    createBuiltInDrifs,
    createGearSlotUpdate,
    createImportedGearSlotState,
    collectUsedOrbTypes,
    getAvailablePrimaryOrbs,
    getAvailableSecondaryOrbs,
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
        expect(calculateMaximumOrbSizeIndex({ hasItem: true, tier: 10 })).toBe(3);
        expect(calculateMaximumOrbSizeIndex({ hasItem: true, tier: 3 })).toBe(0);
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
            builtInLvls: [1, 1],
        });
    });

    it("uses level one when an imported drif has no explicit level", () => {
        const state = createImportedGearSlotState(
            { itemId: 7, drifIds: [3], drifLevels: {} },
            [],
            [{ id: 3, name: "Subdrif", size: "SUBDRIF" }]
        );

        expect(state.drifLevels).toEqual({ 0: 1 });
    });

    it("preserves imported built-in levels and publishes them after regular drifs", () => {
        const imported = createImportedGearSlotState(
            {
                itemId: 7,
                drifIds: [3, 4],
                drifLevels: { 0: 12, 1: 16 },
            },
            [],
            [],
            2
        );
        expect(imported.builtInLvls).toEqual([12, 16]);

        expect(
            createGearSlotUpdate({
                selectedItem: "7",
                itemStars: 9,
                orbSlots: {
                    orb1: { id: "2", level: "3" },
                    orb2: { id: "", level: "" },
                },
                isLegendary: false,
                selectedDrifs: [],
                drifLevels: {},
                maxDrifs: 0,
                builtInDrifs: [{ id: 3 }, { id: 4 }],
                builtInLvls: imported.builtInLvls,
            })
        ).toEqual({
            itemId: "7",
            itemStars: 9,
            orbIds: ["2"],
            orbLevels: [3],
            drifIds: [3, 4],
            drifLevels: { 0: 12, 1: 16 },
        });
    });

    it("resolves built-in drif templates from the shared item rule", () => {
        expect(
            createBuiltInDrifs({
                item: { name: "Hełm X", rarity: "EPIC" },
                epicBuiltInDrifs: { Hełm: ["CRIT"] },
                drifs: [{ id: 3, size: "MAGNIDRIF", bonusType: "CRIT" }],
                bonusTranslations: { CRIT: "Krytyk" },
            })
        ).toEqual([{ id: 3, bonusType: "CRIT", displayName: "Krytyk" }]);
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

    it("filters orb choices by global uniqueness, slot rules, tier, and legendary slot", () => {
        const orbs = [
            { id: 1, bonusType: "A", category: "DEFENSIVE", size: "SUBORB" },
            { id: 2, bonusType: "B", category: "OFFENSIVE", size: "MAGNIORB" },
            { id: 3, bonusType: "C", category: "OFFENSIVE", size: "BIORB" },
        ];
        const usedTypes = collectUsedOrbTypes(
            { helmet: { orbIds: [1] }, weapon: { orbIds: [] } },
            "weapon",
            orbs
        );
        expect(
            getAvailablePrimaryOrbs({
                orbs,
                allowedCategories: ["DEFENSIVE"],
                usedTypes,
                isLegendary: true,
                maximumSizeIndex: 1,
                secondaryOrbId: 3,
            }).map((orb) => orb.id)
        ).toEqual([]);
        expect(
            getAvailableSecondaryOrbs({
                orbs,
                usedTypes: [],
                isLegendary: true,
                primaryOrbId: 2,
                maximumSizeIndex: 2,
            }).map((orb) => orb.id)
        ).toEqual([3]);
    });

    it("excludes the secondary orb bonus from primary orb choices", () => {
        const orbs = [
            { id: 1, bonusType: "A", category: "OFFENSIVE", size: "SUBORB" },
            { id: 2, bonusType: "A", category: "OFFENSIVE", size: "BIORB" },
            { id: 3, bonusType: "B", category: "OFFENSIVE", size: "BIORB" },
        ];

        expect(
            getAvailablePrimaryOrbs({
                orbs,
                allowedCategories: ["OFFENSIVE"],
                usedTypes: [],
                isLegendary: true,
                maximumSizeIndex: 3,
                secondaryOrbId: 2,
            }).map((orb) => orb.id)
        ).toEqual([3]);
    });

    it("does not publish levels for removed stones or stones in an empty item slot", () => {
        const state = {
            selectedItem: "7",
            itemStars: 1,
            orbSlots: { orb1: { id: "2", level: "1" }, orb2: {} },
            isLegendary: false,
            selectedDrifs: ["", 3],
            drifLevels: { 0: 1, 1: 6 },
            maxDrifs: 2,
            builtInDrifs: [],
            builtInLvls: [],
        };
        expect(createGearSlotUpdate(state).drifLevels).toEqual({ 1: 6 });
        expect(createGearSlotUpdate({ ...state, selectedItem: "" })).toEqual({
            itemId: null,
            itemStars: 1,
            orbIds: [],
            orbLevels: [],
            drifIds: [],
            drifLevels: {},
        });
    });
});
