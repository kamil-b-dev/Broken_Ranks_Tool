import { describe, expect, it } from "vitest";
import { parseGameBuildPayload } from "./gameBuildFile";
import { createBuildPayload, parseBuildFile, parseBuildPayload } from "./buildFile";
import trackerBuild from "../../test/fixtures/builds/tracker-build.json";
import trackerCatalog from "../../test/fixtures/builds/tracker-catalog.json";
import legacyCatalog from "../../test/fixtures/builds/legacy-epic-catalog.json";

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
    it("imports intelligence and its allocated points from a game export", () => {
        const result = parseGameBuildPayload(
            { stats: { Level: 140, BaseIntelligence: 35 }, equipped: {}, equipmentList: [] },
            catalog
        );
        expect(result.requestData.characterStats.Inteligencja).toBe(35);
        expect(result.characterConfig.spentPoints.Inteligencja).toBe(25);
    });
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

    it("uses rank and rarity to resolve duplicate item names", () => {
        const items = [
            { id: 1, name: "Ostrze", category: "WEAPON_1H", tier: "X", rarity: "RARE" },
            { id: 2, name: "Ostrze", category: "WEAPON_1H", tier: "XI", rarity: "EPIC" },
            { id: 3, name: "Ostrze", category: "WEAPON_2H", tier: "XI", rarity: "RARE" },
        ];
        const result = parseGameBuildPayload(
            {
                stats: {},
                equipped: { 1: 7 },
                equipmentList: [
                    {
                        EqId: 7,
                        Name: "Ostrze",
                        GearType: "nieznany_typ_broni",
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
            Inteligencja: 10,
            PŻ: 200,
            Mana: 200,
            Kondycja: 200,
        });
        expect(result.characterConfig).toMatchObject({ level: 1, spentPoints: { PŻ: 0 } });
    });

    it.each(["WEAPON_1H", "WEAPON_2H", "WEAPON_RANGED"])(
        "assigns a named %s from the catalog regardless of HUD gear metadata",
        (category) => {
            for (const metadata of [
                {},
                { GearType: "axe_th", GearCategory: "Weapons" },
                { GearType: "nieznany_typ_broni" },
                { GearType: "helmet", GearCategory: "Armors" },
            ]) {
                const result = parseGameBuildPayload(
                    {
                        stats: {},
                        equipped: { 4: 7 },
                        equipmentList: [{ EqId: 7, Name: ' " OSTRZE " ', ...metadata }],
                    },
                    { items: [{ id: 1, name: "Ostrze", category, tier: "X", rarity: "RARE" }] }
                );
                expect(result.requestData.slots.weapon.itemId).toBe(1);
                expect(Object.keys(result.requestData.slots)).toEqual(["weapon"]);
            }
        }
    );

    it("does not use HUD gear type to guess between ambiguous catalog names", () => {
        expect(() =>
            parseGameBuildPayload(
                {
                    stats: {},
                    equipped: { 4: 7 },
                    equipmentList: [
                        { EqId: 7, Name: "Ostrze", GearType: "weapon_1h", Rank: 10, Type: "rar" },
                    ],
                },
                {
                    items: [
                        { id: 1, name: "Ostrze", category: "WEAPON_1H", tier: "X", rarity: "RARE" },
                        { id: 2, name: "Ostrze", category: "WEAPON_2H", tier: "X", rarity: "RARE" },
                    ],
                }
            )
        ).toThrow("Nie znaleziono jednoznacznego odpowiednika: Ostrze.");
    });

    it("imports both rings, defaults missing levels and reports unmatched modifiers", () => {
        const result = parseGameBuildPayload(
            {
                stats,
                equipped: { 1: 1, 2: 2 },
                equipmentList: [
                    {
                        EqId: 1,
                        Name: "Dar Skrzydlatej",
                        Orbs: [
                            { Name: "Orb złota", Level: 3 },
                            { Name: "Nieznany orb", Level: 2 },
                        ],
                        Drifs: [
                            { Name: "Magnidrif astah" },
                            { Name: "Subdrif nieznany", Level: 5 },
                        ],
                    },
                    { EqId: 2, Name: "Dar Skrzydlatej" },
                ],
            },
            {
                ...catalog,
                orbs: [{ id: 9, name: "Orb złota", size: "ARCYORB" }],
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
        expect(result.importSummary).toMatchObject({
            importedItems: 2,
            importedDrifs: 1,
            skippedDrifs: 1,
            importedOrbs: 1,
            skippedOrbs: 1,
        });
        expect(result.lockedSlots).toEqual([]);
        expect(result.lockedDrifs).toEqual({});
    });

    it.each([
        {
            stone: "drif",
            equipment: { Drifs: [{ Name: "Magnidrif astah", Level: 17 }] },
            expected: "Nieprawidłowy poziom drifa Astah: 17.",
        },
        {
            stone: "orb",
            equipment: { Orbs: [{ Name: "Orb złota", Level: 2 }] },
            expected: "Nieprawidłowy poziom orba Orb złota: 2.",
        },
    ])("rejects an out-of-range imported $stone level", ({ equipment, expected }) => {
        expect(() =>
            parseGameBuildPayload(
                {
                    stats,
                    equipped: { 1: 1 },
                    equipmentList: [
                        {
                            EqId: 1,
                            Name: "Nienawiść Draugula",
                            GearType: "belt",
                            ...equipment,
                        },
                    ],
                },
                {
                    ...catalog,
                    orbs: [{ id: 9, name: "Orb złota", size: "SUBORB" }],
                }
            )
        ).toThrow(expected);
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
    it("preserves explicit zero base stats instead of replacing them with defaults", () => {
        const result = parseGameBuildPayload(
            { stats: { BaseStrength: 0, BaseHealth: 0 }, equipped: {}, equipmentList: [] },
            catalog
        );
        expect(result.requestData.characterStats).toMatchObject({ Siła: 0, PŻ: 0, Mana: 200 });
    });

    it("imports the tracker export through the file reader and preserves it in native v3", async () => {
        const data = { ...trackerCatalog, gameRules: legacyCatalog.gameRules };
        const text = JSON.stringify(trackerBuild);
        const result = await parseBuildFile({ size: text.length, text: async () => text }, data);
        expect(result.importSummary).toMatchObject({
            importedItems: 12,
            importedDrifs: 33,
            importedOrbs: 0,
            skippedDrifs: 0,
            skippedOrbs: 14,
            importedBackpackItems: 1,
            importedBackpackDrifs: 3,
            skippedBackpackItems: 0,
            skippedSkins: 3,
        });
        expect(result.requestData.slots.weapon).toMatchObject({ itemId: 178, itemStars: 9 });
        expect(result.requestData.slots.ring1.itemStars).toBe(8);
        expect(result.requestData.slots.ring2.itemStars).toBe(8);
        expect(result.backpack).toHaveLength(1);
        expect(result.backpack[0].equipment).toMatchObject({
            itemId: "35",
            itemStars: 1,
            drifLevels: { 0: 11, 1: 15, 2: 19 },
        });
        expect(result.characterConfig).toBeNull();
        expect(result.requestData.characterStats).toEqual({
            Siła: 260,
            Zręczność: 240,
            Moc: 10,
            Wiedza: 10,
            Inteligencja: 40,
            PŻ: 540,
            Mana: 200,
            Kondycja: 400,
        });
        expect(result.importSummary.warnings[0]).toContain("564/556");
        const { importSummary: _summary, ...state } = result;
        expect(parseBuildPayload(createBuildPayload(result), data)).toEqual(state);
    });

    it("keeps separate backpack copies and reports unknown spares without dropping the build", () => {
        const result = parseGameBuildPayload(
            {
                stats: {},
                equipped: { 1: 1 },
                equipmentList: [
                    { EqId: 1, Name: "Dar Skrzydlatej" },
                    {
                        EqId: 2,
                        Name: "Dar Skrzydlatej",
                        Drifs: [{ Name: "Arcydrif astah", Level: 21 }],
                    },
                    { EqId: 3, Name: "Dar Skrzydlatej" },
                    { EqId: 4, Name: "Nieznany" },
                ],
            },
            catalog
        );
        expect(result.backpack).toHaveLength(2);
        expect(new Set(result.backpack.map((entry) => entry.id)).size).toBe(2);
        expect(result.backpack[0].equipment.drifLevels).toEqual({ 0: 21 });
        expect(result.importSummary).toMatchObject({
            importedItems: 1,
            importedBackpackItems: 2,
            skippedBackpackItems: 1,
        });
    });

    it("rejects duplicate equipment identities instead of duplicating owned items", () => {
        const item = { EqId: 1, Name: "Dar Skrzydlatej" };
        expect(() =>
            parseGameBuildPayload(
                { stats: {}, equipped: { 1: 1 }, equipmentList: [item, item] },
                catalog
            )
        ).toThrow("powtórzone ID");
        expect(() =>
            parseGameBuildPayload(
                { stats: {}, equipped: { 1: 1, 2: 1 }, equipmentList: [item] },
                catalog
            )
        ).toThrow("założony więcej niż raz");
    });

    it("does not bypass equipped capacity validation for a tracker build", async () => {
        const payload = structuredClone(trackerBuild);
        const helmet = payload.equipmentList.find((entry) => entry.EqId === 22600668);
        helmet.Drifs[1] = { Name: "Arcydrif alorn", Level: 21 };
        const text = JSON.stringify(payload);
        await expect(
            parseBuildFile(
                { size: text.length, text: async () => text },
                {
                    ...trackerCatalog,
                    gameRules: legacyCatalog.gameRules,
                }
            )
        ).rejects.toThrow("Drify przekraczają pojemność przedmiotu w slocie helmet");
    });

    it("enforces the native backpack limit for external imports", async () => {
        const payload = {
            stats: {},
            equipped: {},
            equipmentList: Array.from({ length: 201 }, (_, index) => ({
                EqId: index + 1,
                Name: "Dar Skrzydlatej",
            })),
        };
        const text = JSON.stringify(payload);
        await expect(
            parseBuildFile({ size: text.length, text: async () => text }, catalog)
        ).rejects.toThrow("200");
    });
});
