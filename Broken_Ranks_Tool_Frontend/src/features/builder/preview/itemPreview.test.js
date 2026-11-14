import { describe, expect, it } from "vitest";
import { replacementRequest, equipmentWearWarnings } from "./itemPreview";
const data = {
    items: [
        { id: 1, category: "HELMET", name: "A", rarity: "RARE" },
        {
            id: 2,
            category: "HELMET",
            name: "B",
            rarity: "RARE",
            reqLevel: 100,
            allowedClasses: ["KNIGHT"],
        },
    ],
    drifs: [],
    orbs: [],
    gameRules: {},
};
describe("item preview and wear requirements", () => {
    it("creates an independent validated request and keeps the original stones", () => {
        const current = {
            slots: { helmet: { itemId: 1, itemStars: 1, drifIds: [], orbIds: [] } },
            characterStats: {},
        };
        const candidate = replacementRequest(current, "helmet", data.items[1], data, true);
        expect(candidate.slots.helmet.itemId).toBe(2);
        candidate.slots.helmet.itemStars = 8;
        expect(current.slots.helmet.itemId).toBe(1);
        expect(current.slots.helmet.itemStars).toBe(1);
    });
    it("warns without rejecting theorycrafting and respects unknown class metadata", () => {
        const request = { slots: { helmet: { itemId: 2 } } };
        expect(equipmentWearWarnings(request, data.items, 90, "FIRE_MAGE")).toHaveLength(2);
        expect(equipmentWearWarnings(request, data.items, 100, "KNIGHT")).toEqual([]);
    });
});
