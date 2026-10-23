import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    EQUIPMENT_DRAFT_STORAGE_KEY,
    EQUIPMENT_DRAFT_RECOVERY_STORAGE_KEY,
    preserveEquipmentDraft,
    readEquipmentDraft,
    readEquipmentDraftState,
    LEGACY_EQUIPMENT_DRAFT_STORAGE_KEY,
    readOptimizerDraft,
    writeEquipmentDraft,
    writeOptimizerDraft,
} from "./workingDraftStorage";

describe("workingDraftStorage", () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => vi.restoreAllMocks());

    it("keeps earlier recovery copies and archives damaged data before any automatic overwrite", () => {
        localStorage.setItem(EQUIPMENT_DRAFT_RECOVERY_STORAGE_KEY, "older backup");
        localStorage.setItem(EQUIPMENT_DRAFT_STORAGE_KEY, "new damage");
        expect(writeEquipmentDraft({ requestData: { slots: {} } })).toBe(true);
        expect(localStorage.getItem(EQUIPMENT_DRAFT_RECOVERY_STORAGE_KEY)).toBe("older backup");
        const extra = Object.keys(localStorage).find((key) =>
            key.startsWith(EQUIPMENT_DRAFT_RECOVERY_STORAGE_KEY + ".")
        );
        expect(localStorage.getItem(extra)).toBe("new damage");
    });

    it("refuses to replace a rejected draft if its backup cannot be written", () => {
        const storage = {
            getItem: (key) => (key === EQUIPMENT_DRAFT_STORAGE_KEY ? "broken" : null),
            setItem: vi.fn(() => {
                throw new Error("quota");
            }),
        };
        expect(writeEquipmentDraft({ requestData: { slots: {} } }, storage)).toBe(false);
        expect(storage.setItem).toHaveBeenCalledTimes(1);
        expect(storage.setItem.mock.calls[0][0]).toBe(EQUIPMENT_DRAFT_RECOVERY_STORAGE_KEY);
    });

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
        expect(readEquipmentDraft(storage)).toEqual({ ...equipment, backpack: [] });
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
        expect(readEquipmentDraft()).toEqual({ ...equipment, backpack: [] });
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

    it("preserves an invalid current draft and never resurrects an older v1 workspace", () => {
        const legacy = JSON.stringify({
            version: 1,
            value: { requestData: { slots: { helmet: { itemId: 1 } } } },
        });
        const current = JSON.stringify({
            version: 2,
            value: { requestData: { slots: {} }, backpack: null },
        });
        localStorage.setItem(LEGACY_EQUIPMENT_DRAFT_STORAGE_KEY, legacy);
        localStorage.setItem(EQUIPMENT_DRAFT_STORAGE_KEY, current);
        expect(readEquipmentDraftState()).toMatchObject({
            draft: null,
            rejected: true,
            sourceKey: EQUIPMENT_DRAFT_STORAGE_KEY,
        });
        expect(readEquipmentDraft()).toBeNull();
        expect(preserveEquipmentDraft()).toBe(true);
        expect(localStorage.getItem(EQUIPMENT_DRAFT_RECOVERY_STORAGE_KEY)).toBe(current);
        expect(localStorage.getItem(LEGACY_EQUIPMENT_DRAFT_STORAGE_KEY)).toBe(legacy);
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
