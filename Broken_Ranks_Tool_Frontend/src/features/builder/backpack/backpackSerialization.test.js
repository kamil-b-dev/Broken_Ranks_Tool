import { describe, expect, it } from "vitest";
import { normalizeBackpack } from "./backpackSerialization";

const item = (equipment = {}) => ({
    id: "item",
    kind: "ITEM",
    equipment: {
        itemId: "1",
        itemStars: 1,
        orbIds: [],
        orbLevels: [],
        drifIds: [],
        drifLevels: {},
        ...equipment,
    },
});
const stone = { id: "stone", kind: "DRIF", templateId: "60", level: 6 };

describe("backpack structure validation", () => {
    it.each([
        { drifIds: [], drifLevels: { 0: 1 } },
        { drifIds: [null], drifLevels: { 0: 1 } },
        { drifIds: ["60"], drifLevels: { 1: 1 } },
        { drifIds: ["60"], drifLevels: { "00": 1 } },
        { orbIds: [null, "50"], orbLevels: [null, 1] },
        { orbIds: ["50"], orbLevels: [null] },
        { orbIds: [], orbLevels: [1] },
        { orbIds: ["50", null], orbLevels: [1, 1] },
        { orbIds: Array(1), orbLevels: [] },
        { drifIds: Array(1), drifLevels: {} },
        { orbIds: ["50"], orbLevels: Array(1) },
    ])("rejects orphan levels, orb gaps and sparse arrays: %j", (equipment) => {
        expect(() => normalizeBackpack([item(equipment)])).toThrow(/niepoprawne dane/);
    });
    it("rejects sparse occurrence lists and checks the capacity before inspecting their entries", () => {
        expect(() => normalizeBackpack(Array(1))).toThrow(/niepoprawne dane/);
        expect(() => normalizeBackpack(Array(201))).toThrow(/maksymalnie 200/);
    });
    it("normalizes empty trailing orb placeholders and defaults an omitted occupied level to one", () => {
        expect(
            normalizeBackpack([item({ orbIds: ["50", null], orbLevels: [1, null] })])[0].equipment
        ).toMatchObject({ orbIds: ["50"], orbLevels: [1] });
        expect(
            normalizeBackpack([item({ orbIds: ["50"], orbLevels: [] })])[0].equipment.orbLevels
        ).toEqual([1]);
        expect(
            normalizeBackpack([item({ orbIds: [null, null], orbLevels: [null, null] })])[0]
                .equipment
        ).toMatchObject({ orbIds: [], orbLevels: [] });
    });
    it("preserves drif gaps, unknown templates and unfinished capacity without accepting orphan levels", () => {
        const original = item({ drifIds: [null, "999999"], drifLevels: { 1: 21 } });
        expect(normalizeBackpack([original])).toEqual([original]);
    });
    it.each([item(), { id: "orb", kind: "ORB", templateId: "50", level: 1 }])(
        "rejects selecting an object other than a loose drif",
        (entry) => {
            expect(() => normalizeBackpack([{ ...entry, sendToBackend: true }])).toThrow();
        }
    );
    it("ignores v2-only selection metadata before validating entries without weakening structural checks", () => {
        expect(
            normalizeBackpack([{ ...stone, sendToBackend: "legacy" }], { preserveSelection: false })
        ).toEqual([stone]);
        expect(() => normalizeBackpack([null], { preserveSelection: false })).toThrow(
            /niepoprawne dane/
        );
        expect(() =>
            normalizeBackpack(Array(201).fill(null), { preserveSelection: false })
        ).toThrow(/200/);
    });
});
