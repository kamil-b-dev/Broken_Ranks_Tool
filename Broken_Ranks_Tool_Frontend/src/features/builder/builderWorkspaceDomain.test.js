import { describe, expect, it } from "vitest";
import { countEquippedSlots, groupItemsBySlot, indexItemsById } from "./builderWorkspaceDomain";

describe("builderWorkspaceDomain", () => {
    it("groups templates by accepted slot categories", () => {
        const helmet = { id: 1, category: "helmet" };
        const weapon = { id: 2, category: "weapon_1h" };
        const grouped = groupItemsBySlot([helmet, weapon]);
        expect(grouped.helmet).toContain(helmet);
        expect(grouped.weapon).toContain(weapon);
    });

    it("indexes numeric identifiers consistently with imported slot data", () => {
        const item = { id: 15, name: "Test" };
        expect(indexItemsById([item]).get("15")).toBe(item);
    });

    it("counts only slots that contain an equipped item", () => {
        expect(
            countEquippedSlots({ helmet: { itemId: 1 }, armor: { itemId: null }, boots: {} })
        ).toBe(1);
    });
});
