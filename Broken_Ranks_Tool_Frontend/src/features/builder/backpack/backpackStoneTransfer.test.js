import { describe, expect, it } from "vitest";
import { builderCatalog } from "../../../test/fixtures/equipment/builderCatalog";
import {
    backpackStoneDropWarning,
    placeBackpackStone,
    removeBackpackStone,
    undoBackpackStoneRemoval,
} from "./backpackStoneTransfer";

const data = {
    ...builderCatalog,
    drifs: [
        ...builderCatalog.drifs,
        { ...builderCatalog.drifs[0], id: 61, size: "ARCYDRIF" },
        {
            ...builderCatalog.drifs[0],
            id: 62,
            bonusType: "MANA_REGEN",
            name: "Ann",
            category: "UTILITY",
        },
    ],
    orbs: [
        ...builderCatalog.orbs,
        { ...builderCatalog.orbs[0], id: 51, size: "BIORB" },
        { id: 52, name: "Atak", bonusType: "ATTACK", category: "OFFENSIVE", size: "SUBORB" },
    ],
};
const rules = {
    ...builderCatalog.gameRules,
    drifBasePowers: { CRITICAL_CHANCE: 4, MANA_REGEN: 1 },
};
const target = {
    id: "item",
    kind: "ITEM",
    equipment: {
        itemId: "1",
        itemStars: 9,
        drifIds: ["61", null, null],
        drifLevels: { 0: 11 },
        orbIds: [],
        orbLevels: [],
    },
};
const drif = { id: "stone", kind: "DRIF", templateId: "60", level: 6 };
const orb = { id: "orb", kind: "ORB", templateId: "51", level: 3 };
const options = (changes = {}) => ({
    entries: [drif, target, orb],
    resource: { source: "backpack", entryId: "stone", dragType: "drifs", id: 999, level: 21 },
    targetId: "item",
    data,
    gameRules: rules,
    ...changes,
});

describe("placing stones into inventory equipment", () => {
    it("extracts and restores a leveled stone without modifying other inventory alternatives", () => {
        const input = options();
        const before = structuredClone(input.entries);
        const result = removeBackpackStone({ ...input, kind: "DRIF", zone: "drif-0" });
        expect(result.entries).toHaveLength(4);
        expect(result.entries[3]).toMatchObject({ kind: "DRIF", templateId: "61", level: 11 });
        expect(result.entries[1].equipment.drifIds.filter(Boolean)).toEqual([]);
        expect(result.entries[0]).toEqual(drif);
        expect(input.entries).toEqual(before);
        const restored = undoBackpackStoneRemoval({
            ...input,
            entries: result.entries,
            undo: result.undo,
        });
        expect(restored).toEqual(before);
    });
    it("undoes orb extraction even when another alternative contains the same orb type", () => {
        const input = options();
        input.entries = [
            { ...target, equipment: { ...target.equipment, orbIds: ["51"], orbLevels: [3] } },
            {
                ...target,
                id: "alternative",
                equipment: { ...target.equipment, orbIds: ["51"], orbLevels: [3] },
            },
        ];
        const result = removeBackpackStone({ ...input, kind: "ORB", zone: "orb1" });
        expect(
            undoBackpackStoneRemoval({ ...input, entries: result.entries, undo: result.undo })
        ).toEqual(input.entries);
    });
    it("does not duplicate a stone that has already been dragged back into its item", () => {
        const input = options();
        const result = removeBackpackStone({ ...input, kind: "DRIF", zone: "drif-0" });
        const placed = placeBackpackStone({
            ...input,
            entries: result.entries,
            resource: { source: "backpack", entryId: result.entries[3].id },
            zone: "drif-0",
        });
        expect(placed[1].equipment.drifLevels[0]).toBe(11);
        expect(placed).toHaveLength(3);
        expect(() =>
            undoBackpackStoneRemoval({ ...input, entries: placed, undo: result.undo })
        ).toThrow(/nie znajduje/);
    });
    it("cannot undo extraction after the loose stone has been edited or the target deleted", () => {
        const input = options();
        const result = removeBackpackStone({ ...input, kind: "DRIF", zone: "drif-0" });
        const edited = result.entries.map((entry) =>
            entry.id === result.entries[3].id ? { ...entry, level: 6 } : entry
        );
        expect(() =>
            undoBackpackStoneRemoval({ ...input, entries: edited, undo: result.undo })
        ).toThrow(/zmieniona/);
        expect(() =>
            undoBackpackStoneRemoval({
                ...input,
                entries: result.entries.filter((entry) => entry.id !== "item"),
                undo: result.undo,
            })
        ).toThrow(/Wybierz przedmiot/);
    });
    it("replaces the same bonus at its position, retains both levels and keeps item identity and list order", () => {
        const source = options();
        const before = structuredClone(source);
        const result = placeBackpackStone(source);
        expect(result.map((entry) => entry.kind)).toEqual(["DRIF", "ITEM", "ORB"]);
        expect(result[0]).toMatchObject({ kind: "DRIF", templateId: "61", level: 11 });
        expect(result[0].id).not.toBe(drif.id);
        expect(result[1].id).toBe("item");
        expect(result[1].equipment.drifIds).toEqual(["60", null, null]);
        expect(result[1].equipment.drifLevels).toEqual({ 0: 6 });
        expect(result[2]).toEqual(orb);
        expect(source).toEqual(before);
    });
    it("fills a free socket and removes only the selected duplicate occurrence", () => {
        const loose = { ...drif, templateId: "62" };
        const copy = { ...loose, id: "copy" };
        const result = placeBackpackStone(
            options({
                entries: [loose, copy, target],
                resource: { source: "backpack", entryId: "stone" },
            })
        );
        expect(result.map((entry) => entry.id)).toEqual(["copy", "item"]);
        expect(result[1].equipment.drifIds).toEqual(["61", "62", null]);
        expect(result[1].equipment.drifLevels).toEqual({ 0: 11, 1: 6 });
    });
    it("places an orb with its level independently of the same orb in another inventory item", () => {
        const another = {
            ...target,
            id: "another",
            equipment: { ...target.equipment, orbIds: ["51"], orbLevels: [3] },
        };
        const result = placeBackpackStone(
            options({
                entries: [target, another, orb],
                resource: { source: "backpack", entryId: "orb" },
            })
        );
        expect(result).toHaveLength(2);
        expect(result[0].equipment.orbIds).toEqual(["51"]);
        expect(result[0].equipment.orbLevels).toEqual([3]);
        expect(result[1]).toEqual(another);
    });
    it("accepts catalog copies with level 1 and returns the replaced owned stone", () => {
        const result = placeBackpackStone(
            options({
                entries: [target],
                resource: { dragType: "drifs", id: 60, level: 21, bonusType: "FORGED" },
            })
        );
        expect(result).toHaveLength(2);
        expect(result[0].equipment.drifLevels).toEqual({ 0: 1 });
        expect(result[1]).toMatchObject({ kind: "DRIF", templateId: "61", level: 11 });
    });
    it("supports an explicit occupied socket and an explicit orb replacement", () => {
        const result = placeBackpackStone(
            options({ entries: [{ ...drif, templateId: "62" }, target], zone: "drif-0" })
        );
        expect(result[0]).toMatchObject({ templateId: "61", level: 11 });
        expect(result[1].equipment.drifIds[0]).toBe("62");
        const withOrb = {
            ...target,
            equipment: { ...target.equipment, orbIds: ["50"], orbLevels: [1] },
        };
        const replaced = placeBackpackStone(
            options({
                entries: [withOrb, orb],
                resource: { source: "backpack", entryId: "orb" },
                zone: "orb1",
            })
        );
        expect(replaced[0].equipment.orbLevels).toEqual([3]);
        expect(replaced[1]).toMatchObject({ kind: "ORB", templateId: "50", level: 1 });
    });
    it("requires a specific socket when all sockets contain different bonuses", () => {
        const expanded = {
            ...data,
            drifs: [
                ...data.drifs,
                { ...data.drifs[0], id: 63, bonusType: "STAMINA_REGEN" },
                { ...data.drifs[0], id: 64, bonusType: "DAMAGE_MAGIC" },
            ],
        };
        const full = {
            ...target,
            equipment: {
                ...target.equipment,
                drifIds: ["61", "62", "63"],
                drifLevels: { 0: 1, 1: 1, 2: 1 },
            },
        };
        const input = options({
            data: expanded,
            entries: [{ ...drif, templateId: "64" }, full],
            gameRules: {
                ...rules,
                drifBasePowers: { ...rules.drifBasePowers, STAMINA_REGEN: 1, DAMAGE_MAGIC: 3 },
            },
        });
        expect(backpackStoneDropWarning(input)).toMatch(/Brak wolnego gniazda/);
        const placed = placeBackpackStone({ ...input, zone: "drif-2" });
        expect(placed[0]).toMatchObject({ templateId: "63", level: 1 });
        expect(placed[1].equipment.drifIds).toEqual(["61", "62", "64"]);
    });
    it("uses the free second offensive orb socket of a legendary item", () => {
        const legendaryData = {
            ...data,
            items: [...data.items, { ...data.items[0], id: 99, rarity: "LEGENDARY" }],
        };
        const legendary = {
            ...target,
            equipment: { ...target.equipment, itemId: "99", orbIds: ["50"], orbLevels: [1] },
        };
        const result = placeBackpackStone(
            options({
                entries: [{ ...orb, templateId: "52", level: 1 }, legendary],
                data: legendaryData,
                resource: { source: "backpack", entryId: "orb" },
            })
        );
        expect(result[0].equipment.orbIds).toEqual(["50", "52"]);
        expect(result[0].equipment.orbLevels).toEqual([1, 1]);
    });
    it("does not replace fixed built-in drifs", () => {
        const epicData = {
            ...data,
            items: [...data.items, { ...data.items[0], id: 99, rarity: "EPIC" }],
        };
        expect(
            backpackStoneDropWarning(
                options({
                    data: epicData,
                    entries: [
                        drif,
                        { ...target, equipment: { ...target.equipment, itemId: "99" } },
                    ],
                })
            )
        ).toMatch(/Wbudowanych drifów/);
    });
    it.each([
        [
            "missing source",
            { resource: { source: "backpack", entryId: "gone" } },
            /nie znajduje się już/,
        ],
        ["non-item target", { targetId: "stone" }, /Wybierz przedmiot/],
        [
            "item used as a stone",
            { resource: { source: "backpack", entryId: "item" } },
            /orb albo drif/,
        ],
        ["wrong orb category", { resource: { dragType: "orbs", id: 52 } }, /kategorię/],
        ["wrong target socket", { zone: "orb1" }, /nie pasuje/],
        [
            "capacity at actual level",
            {
                entries: [
                    { ...drif, templateId: "61", level: 21 },
                    { ...target, equipment: { ...target.equipment, itemStars: 1 } },
                ],
            },
            /pojemność/,
        ],
        [
            "forged catalog source",
            { resource: { source: "foreign", dragType: "drifs", id: 60 } },
            /źródło/,
        ],
    ])("rejects %s without changing inventory", (_reason, changes, message) => {
        const input = options(changes);
        const before = structuredClone(input);
        expect(() => placeBackpackStone(input)).toThrow(message);
        expect(backpackStoneDropWarning(input)).toMatch(message);
        expect(input).toEqual(before);
    });
    it("prevents adding a returned catalog replacement to a full inventory but allows conserving a moved occurrence", () => {
        const full = [
            target,
            ...Array.from({ length: 199 }, (_, index) => ({ ...drif, id: `stone-${index}` })),
        ];
        expect(() =>
            placeBackpackStone(options({ entries: full, resource: { dragType: "drifs", id: 60 } }))
        ).toThrow(/Zwolnij miejsce/);
        expect(
            placeBackpackStone(
                options({ entries: full, resource: { source: "backpack", entryId: "stone-0" } })
            )
        ).toHaveLength(200);
    });
});
