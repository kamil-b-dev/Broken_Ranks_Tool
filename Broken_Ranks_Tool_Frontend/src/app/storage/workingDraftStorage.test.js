import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    EQUIPMENT_DRAFT_STORAGE_KEY,
    EQUIPMENT_DRAFT_RECOVERY_STORAGE_KEY,
    preserveEquipmentDraft,
    readEquipmentDraft,
    readOptimizerDraft,
    writeEquipmentDraft,
    writeOptimizerDraft,
} from "./workingDraftStorage";

describe("workingDraftStorage", () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => vi.restoreAllMocks());

    it("keeps reads and automatic writes safe when obtaining localStorage throws", () => {
        vi.spyOn(globalThis, "localStorage", "get").mockImplementation(() => {
            throw new DOMException("Storage blocked", "SecurityError");
        });

        expect(readEquipmentDraft()).toBeNull();
        expect(readOptimizerDraft()).toBeNull();
        expect(writeEquipmentDraft({ requestData: { slots: {} } })).toBe(false);
        expect(writeOptimizerDraft({ priorities: [] })).toBe(false);
    });

    it("uses injected storage without accessing the browser getter", () => {
        const storage = localStorage;
        vi.spyOn(globalThis, "localStorage", "get").mockImplementation(() => {
            throw new DOMException("Storage blocked", "SecurityError");
        });
        const equipment = {
            requestData: { slots: {}, characterStats: {} },
            characterConfig: null,
            lockedSlots: [],
            lockedDrifs: {},
        };
        const optimizer = { priorities: [] };

        expect(writeEquipmentDraft(equipment, storage)).toBe(true);
        expect(readEquipmentDraft(storage)).toEqual(equipment);
        expect(writeOptimizerDraft(optimizer, storage)).toBe(true);
        expect(readOptimizerDraft(storage)).toEqual(optimizer);
    });

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

    it("preserves the exact rejected draft before the working key is replaced", () => {
        const original = JSON.stringify({
            version: 1,
            value: { requestData: { slots: { helmet: { itemId: 999 } } } },
        });
        localStorage.setItem(EQUIPMENT_DRAFT_STORAGE_KEY, original);
        expect(preserveEquipmentDraft()).toBe(true);
        writeEquipmentDraft({ requestData: { slots: {} } });
        expect(localStorage.getItem(EQUIPMENT_DRAFT_RECOVERY_STORAGE_KEY)).toBe(original);
    });

    it("reports failure when a rejected draft cannot be backed up", () => {
        const storage = {
            getItem: () => "original",
            setItem: () => {
                throw new DOMException("full", "QuotaExceededError");
            },
        };
        expect(preserveEquipmentDraft(storage)).toBe(false);
    });
});
