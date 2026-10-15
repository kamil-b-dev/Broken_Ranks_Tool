import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { builderCatalog } from "../../../test/fixtures/equipment/builderCatalog";
import { useBackpackEquipmentTransfer } from "./useBackpackEquipmentTransfer";

const equipment = {
    itemId: "1",
    itemStars: 7,
    orbIds: [],
    orbLevels: [],
    drifIds: [],
    drifLevels: {},
};
const entry = { id: "owned", kind: "ITEM", equipment };
const start = (initial = {}) => {
    const refresh = vi.fn();
    const hook = renderHook(() => {
        const [backpack, setBackpack] = useState(initial.backpack ?? [entry]);
        const [requestData, setRequestData] = useState(initial.requestData ?? { slots: {} });
        const transfer = useBackpackEquipmentTransfer({
            backpack,
            requestData,
            setBackpack,
            setRequestData,
            data: builderCatalog,
            gameRules: builderCatalog.gameRules,
            markEquipmentChanged: refresh,
            lockedDrifs: initial.lockedDrifs,
            onDrifLocksChange: initial.onDrifLocksChange,
            onEquip: initial.onEquip,
        });
        return { ...transfer, backpack, requestData };
    });
    return { ...hook, refresh };
};

describe("backpack equipment transaction", () => {
    it.each([
        ["ITEM", "item", { helmet: [0, 1], boots: [0] }, { boots: [0] }],
        ["DRIF", "drif-0", { helmet: [0, 1], boots: [0] }, { helmet: [1], boots: [0] }],
        ["DRIF", "drif-0", { boots: [0] }, { helmet: [], boots: [0] }],
        ["ORB", "orb1", { helmet: [0, 1], boots: [0] }, { helmet: [0, 1], boots: [0] }],
    ])(
        "equips %s into %s and updates only the replaced drif locks",
        (kind, zone, lockedDrifs, expectedLocks) => {
            const owned =
                kind === "ITEM"
                    ? entry
                    : {
                          id: "owned",
                          kind,
                          templateId: kind === "DRIF" ? "60" : "50",
                          level: kind === "DRIF" ? 6 : 1,
                      };
            const onDrifLocksChange = vi.fn();
            const onEquip = vi.fn();
            const { result, refresh } = start({
                backpack: [owned],
                requestData: { slots: { helmet: equipment } },
                lockedDrifs,
                onDrifLocksChange,
                onEquip,
            });
            const beforeLocks = structuredClone(lockedDrifs);
            act(() =>
                expect(result.current.equipBackpackEntry("owned", "helmet", zone)).toBe(true)
            );
            expect(onDrifLocksChange).toHaveBeenCalledExactlyOnceWith(expectedLocks);
            expect(lockedDrifs).toEqual(beforeLocks);
            expect(onEquip).toHaveBeenCalledExactlyOnceWith("helmet", zone);
            expect(refresh).toHaveBeenCalledTimes(1);
            expect(result.current.backpackEquipNotice).toBeNull();
            if (kind === "DRIF") {
                expect(result.current.requestData.slots.helmet.drifIds).toEqual(["60"]);
                expect(result.current.requestData.slots.helmet.drifLevels).toEqual({ 0: 6 });
                expect(result.current.backpack).toEqual([]);
            } else if (kind === "ORB") {
                expect(result.current.requestData.slots.helmet.orbIds).toEqual(["50"]);
                expect(result.current.backpack).toEqual([]);
            } else expect(result.current.backpack[0].equipment).toEqual(equipment);
        }
    );

    it("previews removal without modifying either store, including a colliding temporary ID", () => {
        const backpack = [{ id: "preview-1", kind: "DRIF", templateId: "60", level: 1 }];
        const requestData = { slots: { helmet: equipment } };
        const { result, refresh } = start({ backpack, requestData });
        expect(result.current.equipmentRemoval.getRemovalWarning("ITEM")).toBeNull();
        expect(result.current.equipmentRemoval.getRemovalWarning("ORB")).toMatch(/Brak/);
        expect(result.current.backpack).toEqual(backpack);
        expect(result.current.requestData).toEqual(requestData);
        expect(refresh).not.toHaveBeenCalled();
        expect(result.current.equipmentRemoval.getUndoWarning("all:ITEM")).toMatch(/Brak operacji/);
    });

    it("removes and undoes a transfer once even through repeated callbacks before rendering", () => {
        const { result, refresh } = start();
        act(() => {
            result.current.equipBackpackEntry("owned", "helmet");
            const removal = result.current.equipmentRemoval;
            expect(removal.removeEquipment("ITEM")).toBe(true);
            expect(removal.removeEquipment("ITEM")).toBe(false);
            expect(removal.undoRemoval("all:ITEM")).toBe(true);
            expect(removal.undoRemoval("all:ITEM")).toBe(false);
        });
        expect(result.current.requestData.slots.helmet.itemStars).toBe(7);
        expect(result.current.backpack).toEqual([]);
        expect(refresh).toHaveBeenCalledTimes(3);
    });
    it("exposes undo availability and clears history when a build is imported", () => {
        const { result } = start();
        act(() => result.current.equipBackpackEntry("owned", "helmet"));
        act(() => result.current.equipmentRemoval.removeEquipment("ITEM"));
        expect(result.current.equipmentRemoval.getUndoWarning("all:ITEM")).toBeNull();
        act(() => result.current.clearRemovalHistory());
        expect(result.current.equipmentRemoval.getUndoWarning("all:ITEM")).toMatch(/Brak operacji/);
        expect(result.current.backpack).toHaveLength(1);
    });
    it("cannot undo a removal after its returned occurrence has been equipped again", () => {
        const { result } = start();
        act(() => result.current.equipBackpackEntry("owned", "helmet"));
        act(() => result.current.equipmentRemoval.removeEquipment("ITEM"));
        act(() => result.current.equipBackpackEntry(result.current.backpack[0].id, "helmet"));
        expect(result.current.equipmentRemoval.getUndoWarning("all:ITEM")).toMatch(/nie znajduje/);
        act(() => expect(result.current.equipmentRemoval.undoRemoval("all:ITEM")).toBe(false));
        expect(result.current.backpack).toEqual([]);
        expect(result.current.requestData.slots.helmet.itemId).toBe("1");
    });
    it("consumes an occurrence once even if the same event callback is called twice before rendering", () => {
        const { result, refresh } = start();
        act(() => {
            const equip = result.current.equipBackpackEntry;
            expect(equip("owned", "helmet")).toBe(true);
            expect(equip("owned", "helmet")).toBe(false);
        });
        expect(result.current.backpack).toEqual([]);
        expect(result.current.requestData.slots.helmet.itemStars).toBe(7);
        expect(refresh).toHaveBeenCalledTimes(1);
        expect(result.current.backpackEquipNotice).toMatch(/nie znajduje się już/);
    });
    it("keeps both stores and the editor revision untouched when validation rejects a swap", () => {
        const { result, refresh } = start();
        act(() => expect(result.current.equipBackpackEntry("owned", "boots")).toBe(false));
        expect(result.current.backpack).toEqual([entry]);
        expect(result.current.requestData).toEqual({ slots: {} });
        expect(refresh).not.toHaveBeenCalled();
        expect(result.current.getBackpackEquipWarning("owned", "boots")).toMatch(/nie pasuje/);
    });
});
