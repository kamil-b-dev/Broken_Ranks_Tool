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
const start = () => {
    const refresh = vi.fn();
    const hook = renderHook(() => {
        const [backpack, setBackpack] = useState([entry]);
        const [requestData, setRequestData] = useState({ slots: {} });
        const transfer = useBackpackEquipmentTransfer({
            backpack,
            requestData,
            setBackpack,
            setRequestData,
            data: builderCatalog,
            gameRules: builderCatalog.gameRules,
            markEquipmentChanged: refresh,
        });
        return { ...transfer, backpack, requestData };
    });
    return { ...hook, refresh };
};

describe("backpack equipment transaction", () => {
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
