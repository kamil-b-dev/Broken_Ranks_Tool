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

    it.each([null, [], {}, { stats: {}, equipped: {} }])(
        "rejects unsupported payload shapes",
        (payload) => {
            expect(() => parseGameBuildPayload(payload, catalog)).toThrow(
                "Plik nie zawiera obsługiwanego eksportu postaci z gry."
            );
        }
    );

    it("rejects references to missing equipment and duplicate target slots", () => {
        expect(() =>
            parseGameBuildPayload({ stats, equipped: { 1: 404 }, equipmentList: [] }, catalog)
        ).toThrow("Nie znaleziono wyposażenia o ID 404.");

        const rings = [1, 2, 3].map((EqId) => ({
            EqId,
            Name: "Dar Skrzydlatej",
            GearType: "ring",
            Rank: 12,
            Type: "rar",
        }));
        expect(() =>
            parseGameBuildPayload(
                { stats, equipped: { 1: 1, 2: 2, 3: 3 }, equipmentList: rings },
                catalog
            )
        ).toThrow("Nie udało się przypisać do slotu przedmiotu Dar Skrzydlatej.");
    });

    it("uses rank, category and rarity to resolve duplicate item names", () => {
        const items = [
            { id: 1, name: "Ostrze", category: "WEAPON_1H", tier: "X", rarity: "RARE" },
            { id: 2, name: "Ostrze", category: "WEAPON_1H", tier: "XI", rarity: "EPIC" },
            { id: 3, name: "Ostrze", category: "WEAPON_2H", tier: "XI", rarity: "EPIC" },
        ];
        const result = parseGameBuildPayload(
            {
                stats: {},
                equipped: { 1: 7 },
                equipmentList: [
                    {
                        EqId: 7,
                        Name: "Ostrze",
                        GearType: "weapon_1h",
                        Rank: 11,
                        Type: "epik",
                        Ornaments: "nieznane",
                    },
                ],
            },
            { items, orbs: [], drifs: [] }
        );

        expect(result.requestData.slots.weapon.itemId).toBe(2);
        expect(result.requestData.slots.weapon.itemStars).toBe(1);
        expect(result.requestData.characterStats).toEqual({
            Siła: 10,
            Zręczność: 10,
            Moc: 10,
            Wiedza: 10,
            PŻ: 200,
            Mana: 200,
            Kondycja: 200,
        });
        expect(result.characterConfig).toMatchObject({ level: 1, spentPoints: { PŻ: 0 } });
    });

    it("imports both rings, clamps orb levels and reports unmatched modifiers", () => {
        const result = parseGameBuildPayload(
            {
                stats,
                equipped: { 1: 1, 2: 2 },
                equipmentList: [
                    {
                        EqId: 1,
                        Name: "Dar Skrzydlatej",
                        GearType: "ring",
                        Orbs: [
                            { Name: "Orb złota", Level: 99 },
                            { Name: "Nieznany orb", Level: 2 },
                        ],
                        Drifs: [
                            { Name: "Magnidrif astah", Level: 0 },
                            { Name: "Subdrif nieznany", Level: 5 },
                        ],
                    },
                    { EqId: 2, Name: "Dar Skrzydlatej", GearType: "ring" },
                ],
            },
            {
                ...catalog,
                orbs: [{ id: 9, name: "Orb złota" }],
            }
        );

        expect(result.requestData.slots.ring1).toMatchObject({
            itemId: 160,
            orbIds: [9],
            orbLevels: [3],
            drifIds: [79],
            drifLevels: { 0: 1 },
        });
        expect(result.requestData.slots.ring2.itemId).toBe(160);
        expect(result.importSummary).toEqual({
            importedItems: 2,
            importedDrifs: 1,
            skippedDrifs: 1,
            importedOrbs: 1,
            skippedOrbs: 1,
        });
        expect(result.lockedSlots).toEqual([]);
        expect(result.lockedDrifs).toEqual({});
    });

    it("does not guess between duplicate drif or orb catalog entries", () => {
        const duplicatedCatalog = {
            ...catalog,
            drifs: [
                { id: 1, name: "Astah", size: "ARCYDRIF" },
                { id: 2, name: "Astah", size: "ARCYDRIF" },
            ],
            orbs: [
                { id: 3, name: "Orb" },
                { id: 4, name: "Orb" },
            ],
        };
        const result = parseGameBuildPayload(
            {
                stats,
                equipped: { 1: 1 },
                equipmentList: [
                    {
                        EqId: 1,
                        Name: "Nienawiść Draugula",
                        GearType: "belt",
                        Drifs: [{ Name: "Arcydrif Astah", Level: 1 }],
                        Orbs: [{ Name: "Orb", Level: 1 }],
                    },
                ],
            },
            duplicatedCatalog
        );

        expect(result.importSummary).toMatchObject({ skippedDrifs: 1, skippedOrbs: 1 });
    });
});
