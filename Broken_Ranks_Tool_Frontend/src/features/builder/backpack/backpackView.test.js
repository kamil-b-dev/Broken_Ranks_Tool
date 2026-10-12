import { describe, expect, it } from "vitest";
import { backpackSortOptions, visibleBackpackEntries } from "./backpackView";

const data = {
    items: [
        {
            id: 1,
            name: "Żmij",
            tier: "IX",
            rarity: "RARE",
            capacity: 5,
            reqLevel: 80,
            stats: { Siła: 4 },
        },
        {
            id: 2,
            name: "Allenor",
            tier: "X",
            rarity: "EPIC",
            capacity: 6,
            reqLevel: 100,
            stats: { Siła: 10, Moc: 0 },
        },
        { id: 3, name: "Attawa", tier: "II", rarity: "LEGENDARY", capacity: 0 },
    ],
    drifs: [
        { id: 10, name: "Band", size: "ARCYDRIF", bonusType: "CRITICAL_CHANCE" },
        { id: 11, name: "Band", size: "SUBDRIF", bonusType: "CRITICAL_CHANCE" },
    ],
    orbs: [{ id: 20, name: "Orb", size: "BIORB", category: "DEFENSIVE", price: 0 }],
};
const rules = {
    drifBasePowers: { CRITICAL_CHANCE: 4 },
    bonusTranslations: { CRITICAL_CHANCE: "Krytyk" },
};
const entries = [
    { id: "i1", kind: "ITEM", equipment: { itemId: 1, itemStars: 9 } },
    { id: "d1", kind: "DRIF", templateId: 10, level: 1 },
    { id: "i2", kind: "ITEM", equipment: { itemId: 2, itemStars: 1 } },
    { id: "o1", kind: "ORB", templateId: 20, level: 3 },
    { id: "d2", kind: "DRIF", templateId: 11, level: 6 },
    { id: "i3", kind: "ITEM", equipment: { itemId: 3, itemStars: 9 } },
    { id: "copy", kind: "DRIF", templateId: 11, level: 6 },
    { id: "missing", kind: "ITEM", equipment: { itemId: 999, itemStars: 1 } },
];
const view = (sort, filter = "ALL", direction = "asc") =>
    visibleBackpackEntries(entries, data, rules, filter, sort, direction).map((entry) => entry.id);

describe("backpack views", () => {
    it("filters occurrences without changing their identity or persisted order", () => {
        const before = structuredClone(entries);
        expect(view("manual", "DRIF")).toEqual(["d1", "d2", "copy"]);
        expect(view("manual", "ORB")).toEqual(["o1"]);
        expect(view("manual", "ITEM")).toEqual(["i1", "i2", "i3", "missing"]);
        expect(view("name", "ITEM")).toEqual(["i2", "i3", "i1", "missing"]);
        expect(entries).toEqual(before);
    });
    it("orders tiers, rarities and both stone sizes by domain order", () => {
        expect(view("tier", "ITEM")).toEqual(["i3", "i1", "i2", "missing"]);
        expect(view("tier", "ITEM", "desc")).toEqual(["i2", "i1", "i3", "missing"]);
        expect(view("rarity", "ITEM")).toEqual(["i1", "i2", "i3", "missing"]);
        expect(view("size").slice(0, 4)).toEqual(["d2", "copy", "o1", "d1"]);
        expect(view("category", "DRIF")).toEqual(["d1", "d2", "copy"]);
    });
    it("uses configured levels and capacity, preserves ties and puts absent fields last in either direction", () => {
        expect(view("capacity", "ITEM")).toEqual(["i3", "i2", "i1", "missing"]);
        expect(view("level", "DRIF", "desc")).toEqual(["d2", "copy", "d1"]);
        expect(view("stat:Siła", "ITEM", "desc")).toEqual(["i2", "i1", "i3", "missing"]);
        expect(view("stat:Moc", "ITEM")).toEqual(["i2", "i1", "i3", "missing"]);
        expect(view("price", "ALL", "desc")[0]).toBe("o1");
        expect(view("reqLevel", "ITEM")).toEqual(["i1", "i2", "i3", "missing"]);
        expect(view("power", "DRIF")).toEqual(["d1", "d2", "copy"]);
    });
    it("offers catalog stats and only sorting fields applicable to the selected kind", () => {
        expect(backpackSortOptions("ITEM", data)).toContainEqual([
            "stat:Moc",
            "Statystyka bazowa: Moc",
        ]);
        expect(backpackSortOptions("ORB", data).map(([key]) => key)).not.toContain("power");
        expect(backpackSortOptions("DRIF", data).map(([key]) => key)).not.toContain("tier");
        expect(backpackSortOptions("ITEM", data).map(([key]) => key)).not.toContain("level");
    });
});
