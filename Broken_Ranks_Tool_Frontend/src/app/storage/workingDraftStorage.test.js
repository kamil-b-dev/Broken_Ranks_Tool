import { beforeEach, describe, expect, it } from "vitest";
import {
    EQUIPMENT_DRAFT_STORAGE_KEY,
    readEquipmentDraft,
    readOptimizerDraft,
    writeEquipmentDraft,
    writeOptimizerDraft,
} from "./workingDraftStorage";

describe("workingDraftStorage", () => {
    beforeEach(() => localStorage.clear());

    it("round-trips independent equipment and optimizer drafts", () => {
        const equipment = {
            requestData: { slots: { helmet: { itemId: 7 } }, characterStats: { Siła: 100 } },
            characterConfig: { level: 140 },
            lockedSlots: ["helmet"],
            lockedDrifs: { helmet: [0] },
        };
        const optimizer = { format: "optimizer", priorities: [{ key: "ARMOR" }] };

        expect(writeEquipmentDraft(equipment)).toBe(true);
        expect(writeOptimizerDraft(optimizer)).toBe(true);
        expect(readEquipmentDraft()).toEqual(equipment);
        expect(readOptimizerDraft()).toEqual(optimizer);
    });

    it("ignores malformed, obsolete, and incomplete values", () => {
        localStorage.setItem(EQUIPMENT_DRAFT_STORAGE_KEY, "invalid");
        expect(readEquipmentDraft()).toBeNull();

        localStorage.setItem(
            EQUIPMENT_DRAFT_STORAGE_KEY,
            JSON.stringify({ version: 999, value: { requestData: { slots: {} } } })
        );
        expect(readEquipmentDraft()).toBeNull();
    });

    it("does not expose mutable references", () => {
        const draft = { requestData: { slots: {}, characterStats: {} } };
        writeEquipmentDraft(draft);
        const restored = readEquipmentDraft();
        restored.requestData.slots.helmet = { itemId: 1 };

        expect(readEquipmentDraft().requestData.slots).toEqual({});
    });
});
