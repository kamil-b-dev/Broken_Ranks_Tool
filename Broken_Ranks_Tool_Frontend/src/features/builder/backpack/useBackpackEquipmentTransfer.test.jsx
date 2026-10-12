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
