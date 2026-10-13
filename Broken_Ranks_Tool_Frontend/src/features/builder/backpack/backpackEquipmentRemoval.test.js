import { describe, expect, it } from "vitest";
import { builderCatalog } from "../../../test/fixtures/equipment/builderCatalog";
import { prepareEquipmentRemoval, prepareEquipmentRemovalUndo } from "./backpackEquipmentRemoval";

const data = {
    ...builderCatalog,
    items: builderCatalog.items.map((item) => ({
        ...item,
        rarity: item.id === 1 ? "LEGENDARY" : "RARE",
    })),
    orbs: [
        ...builderCatalog.orbs,
        { id: 51, size: "BIORB", bonusType: "ATTACK", category: "OFFENSIVE" },
    ],
    drifs: [
        ...builderCatalog.drifs,
        { ...builderCatalog.drifs[0], id: 61, bonusType: "MANA_REGEN" },
    ],
};
const equipment = {
    itemId: "1",
    itemStars: 8,
    orbIds: ["50", "51"],
    orbLevels: [1, 3],
    drifIds: ["60", null, "61"],
    drifLevels: { 0: 6, 2: 4 },
};
const initial = () => ({
    data,
    gameRules: { ...data.gameRules, drifBasePowers: { CRITICAL_CHANCE: 4, MANA_REGEN: 2 } },
    backpack: [{ id: "existing", kind: "DRIF", templateId: "60", level: 2 }],
    requestData: { slots: { helmet: structuredClone(equipment) }, characterStats: { Siła: 10 } },
    lockedDrifs: { helmet: [0, 2], boots: [1] },
});
const remove = (start, options) => {
    let id = 0;
    return prepareEquipmentRemoval({ ...start, ...options, createId: () => `returned-${++id}` });
};
const undo = (start, next, options = {}) =>
    prepareEquipmentRemovalUndo({ ...start, ...next, ...options });

describe("equipment removal to backpack", () => {
    it("keeps complete items and restores equipment, occurrences and drif locks", () => {
        const start = initial();
        const next = remove(start, { kind: "ITEM" });
        expect(next.backpack[1]).toMatchObject({ kind: "ITEM", equipment });
        expect(next.requestData.slots.helmet.itemId).toBe("");
        expect(next.lockedDrifs).toEqual({ helmet: [], boots: [1] });
        const restored = undo(start, next);
        expect(restored).toMatchObject({
            requestData: start.requestData,
            backpack: start.backpack,
            lockedDrifs: start.lockedDrifs,
        });
        expect(start.requestData.slots.helmet).toEqual(equipment);
    });
    it.each(["ORB", "DRIF"])(
        "moves all %s occurrences with their levels and can restore them",
        (kind) => {
            const start = initial();
            const next = remove(start, { kind });
            expect(next.backpack.slice(1).map((entry) => entry.level)).toEqual(
                kind === "ORB" ? [1, 3] : [6, 4]
            );
            expect(undo(start, next).requestData).toEqual(start.requestData);
            expect(undo(start, next).backpack).toEqual(start.backpack);
        }
    );
    it("compacts the second legendary orb into the first position without losing its level", () => {
        const start = initial();
        const next = remove(start, { kind: "ORB", slotKey: "helmet", zone: "orb1" });
        expect(next.requestData.slots.helmet.orbIds).toEqual(["51"]);
        expect(next.requestData.slots.helmet.orbLevels).toEqual([3]);
        expect(undo(start, next).requestData.slots.helmet.orbIds).toEqual(["50", "51"]);
    });
    it("restores one drif while preserving a later edit to a different socket and stars", () => {
        const start = initial();
        const next = remove(start, { kind: "DRIF", slotKey: "helmet", zone: "drif-0" });
        const slot = next.requestData.slots.helmet;
        const changed = {
            ...next.requestData,
            slots: { helmet: { ...slot, itemStars: 9, drifLevels: { 2: 6 } } },
        };
        const result = undo(start, next, { requestData: changed });
        expect(result.requestData.slots.helmet.drifLevels).toEqual({ 0: 6, 2: 6 });
        expect(result.requestData.slots.helmet.itemStars).toBe(9);
    });
    it("undoes bulk orb removal after drif removal without overwriting the latter", () => {
        const start = initial();
        const orbs = remove(start, { kind: "ORB" });
        const drifs = prepareEquipmentRemoval({
            ...start,
            ...orbs,
            kind: "DRIF",
            createId: () => crypto.randomUUID(),
        });
        const result = undo(start, drifs, { undo: orbs.undo });
        expect(result.requestData.slots.helmet.orbIds).toEqual(equipment.orbIds);
        expect(result.requestData.slots.helmet.drifIds.filter(Boolean)).toEqual([]);
        expect(result.backpack.filter((entry) => entry.kind === "DRIF")).toHaveLength(3);
    });
    it("keeps built-in drifs attached even during bulk drif removal", () => {
        const start = initial();
        start.data = {
            ...data,
            items: data.items.map((item) => (item.id === 1 ? { ...item, rarity: "EPIC" } : item)),
        };
        expect(() => remove(start, { kind: "DRIF" })).toThrow(/Brak rzeczy/);
        expect(remove(start, { kind: "ITEM" }).backpack[1].equipment.drifIds).toEqual(
            equipment.drifIds
        );
    });
    it("rejects a full backpack atomically", () => {
        const start = initial();
        start.backpack = Array.from({ length: 199 }, (_, id) => ({
            id: `owned-${id}`,
            kind: "DRIF",
            templateId: "60",
            level: 1,
        }));
        expect(() => remove(start, { kind: "ORB" })).toThrow(/maksymalnie 200/);
        expect(start.requestData.slots.helmet.orbIds).toEqual(equipment.orbIds);
    });
    it.each(["missing", "edited", "occupied"])(
        "does not undo when a returned occurrence or socket is %s",
        (scenario) => {
            const start = initial();
            const next = remove(start, { kind: "DRIF", slotKey: "helmet", zone: "drif-0" });
            if (scenario === "missing") next.backpack = next.backpack.slice(0, 1);
            if (scenario === "edited")
                next.backpack = next.backpack.map((entry) => ({ ...entry, level: 1 }));
            if (scenario === "occupied") next.requestData = start.requestData;
            expect(() => undo(start, next)).toThrow(/zmienion|nie znajduje/);
        }
    );
    it("rejects undo if an orb type was subsequently equipped in another slot", () => {
        const start = initial();
        const next = remove(start, { kind: "ORB" });
        next.requestData.slots.armor = {
            ...equipment,
            itemId: "2",
            orbIds: ["50"],
            orbLevels: [1],
            drifIds: [],
            drifLevels: {},
        };
        expect(() => undo(start, next)).toThrow(/już użyty/);
    });
    it("rejects restoring drifs after capacity was reduced", () => {
        const start = initial();
        start.data = { ...data, items: data.items.map((item) => ({ ...item, capacity: 5 })) };
        const next = remove(start, { kind: "DRIF" });
        next.requestData.slots.helmet.itemStars = 1;
        expect(() => undo(start, next)).toThrow(/pojemność/);
    });
});
