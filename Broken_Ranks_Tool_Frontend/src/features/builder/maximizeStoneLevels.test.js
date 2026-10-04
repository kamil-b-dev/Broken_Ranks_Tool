import { describe, expect, it } from "vitest";
import { maximizeStoneLevels } from "./maximizeStoneLevels";
const drifs = [1, 2, 3].map((id) => ({
    id,
    name: `Drif ${id}`,
    bonusType: `B${id}`,
    size: "ARCYDRIF",
}));
const config = {
    slots: {
        helmet: { itemId: 9, itemStars: 1, drifIds: [1, 2, 3], drifLevels: { 0: 1, 1: 21, 2: 21 } },
    },
    items: [{ id: 9, name: "Hełm", capacity: 6, rarity: "RARE" }],
    drifs,
    orbs: [],
    gameRules: { drifBasePowers: { B1: 1, B2: 1, B3: 1 } },
    kind: "drifs",
};
describe("maximizeStoneLevels", () => {
    it("prioritizes top sockets and reserves minimum power for later stones", () => {
        const result = maximizeStoneLevels(config);
        expect(result.updates.helmet.drifLevels).toEqual({ 0: 21, 1: 6, 2: 6 });
        expect(result.warnings).toEqual(["Hełm: Drif 2 (6/21), Drif 3 (6/21)."]);
        expect(config.slots.helmet.drifLevels[1]).toBe(21);
    });
    it("uses star capacity and respects drif sizes", () => {
        const result = maximizeStoneLevels({
            ...config,
            slots: { helmet: { ...config.slots.helmet, itemStars: 9 } },
            drifs: [{ ...drifs[0], size: "SUBDRIF" }, drifs[1], drifs[2]],
        });
        expect(result.updates.helmet.drifLevels).toEqual({ 0: 6, 1: 21, 2: 21 });
        expect(result.warnings).toEqual([]);
    });
    it("maximizes built-in drifs without consuming capacity", () => {
        const result = maximizeStoneLevels({
            ...config,
            items: [{ ...config.items[0], rarity: "EPIC", capacity: 0 }],
        });
        expect(result.updates.helmet.drifLevels).toEqual({ 0: 16, 1: 16, 2: 16 });
    });
    it("does not apply an impossible minimum configuration", () => {
        const result = maximizeStoneLevels({
            ...config,
            items: [{ ...config.items[0], capacity: 2 }],
        });
        expect(result.updates).toEqual({});
        expect(result.warnings[0]).toContain("Hełm");
    });
    it("maximizes only existing orbs and leaves drifs intact", () => {
        const result = maximizeStoneLevels({
            ...config,
            kind: "orbs",
            slots: { helmet: { ...config.slots.helmet, orbIds: [4, 5] } },
            orbs: [
                { id: 4, size: "SUBORB" },
                { id: 5, size: "ARCYORB" },
            ],
        });
        expect(result.updates.helmet.orbLevels).toEqual([1, 3]);
        expect(result.updates.helmet.drifLevels).toEqual(config.slots.helmet.drifLevels);
    });
    it("ignores empty slots and does not create levels for empty sockets", () => {
        const result = maximizeStoneLevels({
            ...config,
            slots: {
                empty: { itemId: null },
                helmet: { ...config.slots.helmet, drifIds: [null, 2] },
            },
        });
        expect(result.updates.helmet.drifLevels).toEqual({ 1: 21 });
        expect(result.updates.empty).toBeUndefined();
    });
});
