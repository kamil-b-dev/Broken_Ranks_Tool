import { describe, expect, it } from "vitest";
import { builderCatalog } from "../../../test/fixtures/equipment/builderCatalog";
import {
    backpackDragResource,
    backpackEquipWarning,
    prepareBackpackEquip,
} from "./backpackEquipmentTransfer";

const data = {
    ...builderCatalog,
    items: [
        ...builderCatalog.items,
        { ...builderCatalog.items[0], id: 100, name: "Inny hełm" },
        { ...builderCatalog.items[0], id: 101, name: "Hełm legendarny", rarity: "LEGENDARY" },
        { ...builderCatalog.items[0], id: 102, name: "Epik", rarity: "EPIC" },
    ],
    orbs: [
        ...builderCatalog.orbs,
        { id: 51, name: "Atak", category: "OFFENSIVE", size: "BIORB", bonusType: "ATTACK" },
        { ...builderCatalog.orbs[0], id: 52, size: "BIORB" },
    ],
    drifs: [
        ...builderCatalog.drifs,
        { ...builderCatalog.drifs[0], id: 61, size: "ARCYDRIF" },
        { ...builderCatalog.drifs[0], id: 62, name: "Ogień", bonusType: "DAMAGE_FIRE" },
    ],
};
const gameRules = builderCatalog.gameRules;
const equipment = (changes = {}) => ({
    itemId: "1",
    itemStars: 1,
    orbIds: [],
    orbLevels: [],
    drifIds: [],
    drifLevels: {},
    ...changes,
});
const item = {
    id: "item",
    kind: "ITEM",
    equipment: equipment({
        itemId: "100",
        itemStars: 9,
        orbIds: ["50"],
        orbLevels: [1],
        drifIds: ["60"],
        drifLevels: { 0: 6 },
    }),
};
const drif = { id: "drif", kind: "DRIF", templateId: "61", level: 11 };
const orb = { id: "orb", kind: "ORB", templateId: "52", level: 3 };
const options = (changes = {}) => ({
    backpack: [item, drif, orb],
    requestData: {
        slots: { helmet: equipment({ drifIds: ["60"], drifLevels: { 0: 2 } }) },
        characterStats: { Siła: 10 },
    },
    data,
    gameRules,
    entryId: "item",
    slotKey: "helmet",
    returnedId: "returned",
    ...changes,
});

describe("equipping backpack occurrences", () => {
    it("rejects ambiguous duplicate occurrences before their replacement can erase both copies", () => {
        const input = options({ backpack: [item, { ...item }] });
        const before = structuredClone(input);
        expect(() => prepareBackpackEquip(input)).toThrow(/niepoprawne dane/);
        expect(input).toEqual(before);
    });
    it("swaps an entire configured item without modifying either source snapshot", () => {
        const source = options();
        const before = structuredClone(source);
        const result = prepareBackpackEquip(source);
        expect(result.requestData.slots.helmet).toEqual(item.equipment);
        expect(result.requestData.characterStats).toEqual(source.requestData.characterStats);
        expect(result.backpack).toEqual([
            { id: "returned", kind: "ITEM", equipment: source.requestData.slots.helmet },
            drif,
            orb,
        ]);
        expect(source).toEqual(before);
        result.requestData.slots.helmet.drifLevels[0] = 1;
        expect(item.equipment.drifLevels[0]).toBe(6);
    });
    it("moves to an empty slot and removes only the selected occurrence", () => {
        const copy = { ...item, id: "another-copy" };
        const result = prepareBackpackEquip(
            options({ backpack: [item, copy], requestData: { slots: {} } })
        );
        expect(result.backpack).toEqual([copy]);
        expect(result.requestData.slots.helmet.itemStars).toBe(9);
    });
    it("retains both stone levels during replacement", () => {
        const result = prepareBackpackEquip(options({ entryId: "drif", zone: "drif-0" }));
        expect(result.requestData.slots.helmet.drifIds).toEqual(["61"]);
        expect(result.requestData.slots.helmet.drifLevels).toEqual({ 0: 11 });
        expect(result.backpack[1]).toEqual({
            id: "returned",
            kind: "DRIF",
            templateId: "60",
            level: 2,
        });
        const withOrb = options({
            entryId: "orb",
            zone: "orb1",
            requestData: { slots: { helmet: equipment({ orbIds: ["50"], orbLevels: [1] }) } },
        });
        const replaced = prepareBackpackEquip(withOrb);
        expect(replaced.requestData.slots.helmet.orbLevels).toEqual([3]);
        expect(replaced.backpack[2]).toEqual({
            id: "returned",
            kind: "ORB",
            templateId: "50",
            level: 1,
        });
    });
    it("allows a sparse ordinary drif socket while respecting the item socket limit", () => {
        const result = prepareBackpackEquip(
            options({
                entryId: "drif",
                zone: "drif-2",
                requestData: { slots: { helmet: equipment() } },
            })
        );
        expect(result.requestData.slots.helmet.drifIds).toEqual([null, null, "61"]);
        expect(result.requestData.slots.helmet.drifLevels).toEqual({ 2: 11 });
        expect(backpackEquipWarning(options({ entryId: "drif", zone: "drif-3" }))).toMatch(
            /Za dużo drifów/
        );
    });
    it("uses the requested ring slot rather than the first slot of its category", () => {
        const ring = { ...item, equipment: equipment({ itemId: "10" }) };
        const result = prepareBackpackEquip(
            options({ backpack: [ring], slotKey: "ring2", requestData: { slots: {} } })
        );
        expect(result.requestData.slots.ring2.itemId).toBe("10");
        expect(result.requestData.slots.ring1).toBeUndefined();
    });
    it("checks orb uniqueness against equipped gear but ignores independent backpack alternatives", () => {
        const conflict = options({
            requestData: {
                slots: { armor: equipment({ itemId: "2", orbIds: ["50"], orbLevels: [1] }) },
            },
        });
        expect(() => prepareBackpackEquip(conflict)).toThrow(/Typ orba.*Zbroja/);
        expect(backpackEquipWarning(options())).toBeNull();
    });
    it("supports the second legendary offensive orb and rejects a gap before it", () => {
        const attack = { ...orb, templateId: "51" };
        const result = prepareBackpackEquip(
            options({
                backpack: [attack],
                entryId: "orb",
                zone: "orb2",
                requestData: {
                    slots: { helmet: equipment({ itemId: "101", orbIds: ["50"], orbLevels: [1] }) },
                },
            })
        );
        expect(result.requestData.slots.helmet.orbIds).toEqual(["50", "51"]);
        expect(
            backpackEquipWarning(options({ backpack: [attack], entryId: "orb", zone: "orb2" }))
        ).toMatch(/pierwszy orb/);
    });
    it.each([
        ["missing occurrence", { entryId: "gone" }, /nie znajduje się już/],
        ["wrong item slot", { slotKey: "boots" }, /nie pasuje/],
        ["unknown slot", { slotKey: "unknown" }, /Nieznany slot/],
        ["wrong stone zone", { entryId: "drif", zone: "orb1" }, /nie pasuje/],
        ["duplicate drif bonus", { entryId: "drif", zone: "drif-1" }, /powtarza typ drifa/],
        [
            "capacity at actual level",
            { entryId: "drif", zone: "drif-0", backpack: [{ ...drif, level: 21 }] },
            /pojemność/,
        ],
        [
            "empty equipment",
            { entryId: "orb", zone: "orb1", requestData: { slots: {} } },
            /Najpierw wybierz/,
        ],
        [
            "built-in drif",
            {
                entryId: "drif",
                zone: "drif-0",
                requestData: { slots: { helmet: equipment({ itemId: "102" }) } },
            },
            /Wbudowanych drifów/,
        ],
        [
            "elemental drif on armor",
            {
                entryId: "drif",
                zone: "drif-0",
                backpack: [{ ...drif, templateId: "62", level: 1 }],
            },
            /żywiołowego/,
        ],
        [
            "unknown template",
            { entryId: "orb", zone: "orb1", backpack: [{ ...orb, templateId: "9999" }] },
            /aktualnym katalogu/,
        ],
    ])("rejects %s without changing the backpack or equipment", (_name, changes, message) => {
        const source = options(changes);
        const before = structuredClone(source);
        expect(() => prepareBackpackEquip(source)).toThrow(message);
        expect(source).toEqual(before);
    });
    it("uses occurrence IDs in resource payloads without serializing equipment", () => {
        expect(backpackDragResource(item, data)).toEqual({
            id: 100,
            dragType: "items",
            source: "backpack",
            entryId: "item",
        });
        expect(backpackDragResource({ ...orb, templateId: "999" }, data)).toBeNull();
    });
});
