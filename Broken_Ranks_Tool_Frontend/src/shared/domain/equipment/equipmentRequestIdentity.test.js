import { describe, expect, it } from "vitest";
import { equipmentRequestIdentity } from "./equipmentRequestIdentity";

describe("equipmentRequestIdentity", () => {
    it("keeps equivalent calculator inputs identical without losing stone positions", () => {
        const original = {
            slots: { helmet: { itemId: 1, drifIds: [null, 2], drifLevels: { 1: 1 } } },
        };
        const padded = {
            characterStats: {},
            slots: {
                boots: { itemId: null },
                helmet: {
                    itemId: "1",
                    itemStars: 1,
                    drifIds: ["", "2", ""],
                    drifLevels: { 1: "1" },
                },
            },
        };
        expect(equipmentRequestIdentity(original)).toBe(equipmentRequestIdentity(padded));
        expect(equipmentRequestIdentity(original)).not.toBe(
            equipmentRequestIdentity({ slots: { helmet: { itemId: 1, drifIds: [2] } } })
        );
    });
    it("distinguishes actual levels, character changes and orphan levels", () => {
        const original = { slots: { helmet: { itemId: 1, drifIds: [2] } } };
        for (const request of [
            { slots: { helmet: { itemId: 1, drifIds: [2], drifLevels: { 0: 6 } } } },
            { ...original, characterStats: { Siła: 15 } },
            { slots: { helmet: { itemId: 1, drifIds: [2], drifLevels: { 1: 1 } } } },
        ])
            expect(equipmentRequestIdentity(request)).not.toBe(equipmentRequestIdentity(original));
    });
});
