import { beforeEach, describe, expect, it } from "vitest";
import {
    readEquipmentDraftState,
    writeEquipmentDraft,
    EQUIPMENT_DRAFT_STORAGE_KEY,
} from "./workingDraftStorage";
describe("v4 drafts", () => {
    beforeEach(() => localStorage.clear());
    it("reads an old v3 draft without overwriting it and persists synergetics in v4", () => {
        const oldKey = "broken-ranks-tool.equipment-draft.v3";
        const value = {
            requestData: { slots: {} },
            backpack: [],
            lockedSlots: [],
            lockedDrifs: {},
        };
        const raw = JSON.stringify({ version: 3, value });
        localStorage.setItem(oldKey, raw);
        expect(readEquipmentDraftState().buildVersion).toBe(3);
        value.requestData.slots.ring1 = { synergetic: { name: "Res", stats: { PŻ: 100 } } };
        expect(writeEquipmentDraft(value)).toBe(true);
        expect(readEquipmentDraftState().buildVersion).toBe(4);
        expect(localStorage.getItem(oldKey)).toBe(raw);
        expect(EQUIPMENT_DRAFT_STORAGE_KEY).toContain("v4");
    });
});
