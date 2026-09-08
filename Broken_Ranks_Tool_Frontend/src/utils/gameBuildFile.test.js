import { describe, expect, it } from "vitest";
import { parseGameBuildPayload } from "./gameBuildFile";

const catalog = {
    items: [
        { id: 20, name: "Nienawiść Draugula", category: "BELT", tier: "X", rarity: "RARE" },
        { id: 160, name: "Dar Skrzydlatej", category: "RING", tier: "XII", rarity: "RARE" },
    ],
    drifs: [
        { id: 80, name: "Astah", size: "ARCYDRIF" },
        { id: 79, name: "Astah", size: "MAGNIDRIF" },
    ],
    orbs: [],
};

const stats = {
    Level: 140,
    BaseStrength: 158,
    BaseDexterity: 313,
    BasePower: 10,
    BaseKnowledge: 10,
    BaseHealth: 700,
    BaseMana: 200,
    BaseStamina: 500,
};

describe("parseGameBuildPayload", () => {
    it("maps quoted item names, game slots, ornaments and named drif sizes", () => {
        const result = parseGameBuildPayload(
            {
                stats,
                equipped: { 9: 340, 12: 240 },
                equipmentList: [
                    {
                        EqId: 240,
                        Name: '"Nienawiść Draugula"',
                        GearType: "belt",
                        Rank: 10,
                        Type: "rar",
                        Ornaments: "S2",
                        Drifs: [{ Name: "Arcydrif astah", Level: 21 }],
                        Orbs: [],
                    },
                    {
                        EqId: 340,
                        Name: '"Dar Skrzydlatej"',
                        GearType: "ring",
                        Rank: 12,
                        Type: "rar",
                        Ornaments: "G3",
                        Drifs: [],
                        Orbs: [],
                    },
                ],
            },
            catalog
        );

        expect(result.requestData.slots.belt).toEqual({
            itemId: 20,
            itemStars: 5,
            orbIds: [],
            orbLevels: [],
            drifIds: [80],
            drifLevels: { 0: 21 },
        });
        expect(result.requestData.slots.ring1.itemId).toBe(160);
        expect(result.requestData.slots.ring1.itemStars).toBe(9);
        expect(result.requestData.characterStats["PŻ"]).toBe(700);
        expect(result.characterConfig.spentPoints.Kondycja).toBe(30);
    });

    it("reports unnamed orbs instead of guessing their catalog identity", () => {
        const result = parseGameBuildPayload(
            {
                stats,
                equipped: { 12: 240 },
                equipmentList: [
                    {
                        EqId: 240,
                        Name: "Nienawiść Draugula",
                        GearType: "belt",
                        Rank: 10,
                        Type: "rar",
                        Ornaments: "B1",
                        Drifs: [],
                        Orbs: [{ Name: "", Code: "orb_10_10", Level: 10 }],
                    },
                ],
            },
            catalog
        );

        expect(result.requestData.slots.belt.orbIds).toEqual([]);
        expect(result.importSummary.skippedOrbs).toBe(1);
    });

    it("rejects an equipped item that cannot be matched safely", () => {
        expect(() =>
            parseGameBuildPayload(
                {
                    stats,
                    equipped: { 1: 1 },
                    equipmentList: [{ EqId: 1, Name: "Nieznany", GearType: "helmet" }],
                },
                catalog
            )
        ).toThrow("Nie znaleziono jednoznacznego odpowiednika: Nieznany");
    });
});
