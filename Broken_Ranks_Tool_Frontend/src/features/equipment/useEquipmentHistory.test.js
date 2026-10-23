import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { EQUIPMENT_HISTORY_LIMIT, useEquipmentHistory } from "./useEquipmentHistory";

const catalog = {};
const gameRules = {};
function useBuild(enabled = true, scope = catalog) {
    const [value, setValue] = useState({ slots: {}, backpack: [] });
    const history = useEquipmentHistory({
        value,
        enabled,
        catalog: scope,
        gameRules,
        onRestore: setValue,
    });
    return { value, setValue, ...history };
}

describe("equipment history", () => {
    it("undoes equipment and inventory as one transaction and branches after a new edit", () => {
        const { result } = renderHook(() => useBuild());
        const original = result.current.value;
        const equipped = {
            slots: { helmet: { itemId: 7, itemStars: 9 } },
            backpack: [{ id: "old" }],
        };
        act(() => result.current.setValue(equipped));
        expect(result.current.canUndo).toBe(true);
        act(() => result.current.undo());
        expect(result.current.value).toEqual(original);
        expect(result.current.canUndo).toBe(false);
        expect(result.current.canRedo).toBe(true);
        act(() => result.current.redo());
        expect(result.current.value).toEqual(equipped);
        act(() => result.current.undo());
        act(() => result.current.setValue({ slots: {}, backpack: [{ id: "new" }] }));
        expect(result.current.canRedo).toBe(false);
        act(() => expect(result.current.redo()).toBe(false));
    });

    it("does not record bootstrap, equal snapshots, or retain history across catalog changes", () => {
        const { result, rerender } = renderHook(({ enabled, scope }) => useBuild(enabled, scope), {
            initialProps: { enabled: false, scope: catalog },
        });
        act(() => result.current.setValue({ slots: { helmet: 7 }, backpack: [] }));
        rerender({ enabled: true, scope: catalog });
        expect(result.current.canUndo).toBe(false);
        act(() => result.current.setValue({ slots: { helmet: 7 }, backpack: [] }));
        expect(result.current.canUndo).toBe(false);
        act(() => result.current.setValue({ slots: {}, backpack: [] }));
        expect(result.current.canUndo).toBe(true);
        rerender({ enabled: true, scope: {} });
        expect(result.current.canUndo).toBe(false);
        expect(result.current.canRedo).toBe(false);
    });

    it("bounds retained snapshots and restores detached values", () => {
        const { result } = renderHook(() => useBuild());
        for (let i = 1; i <= EQUIPMENT_HISTORY_LIMIT + 5; i++) {
            act(() => result.current.setValue({ slots: { helmet: i }, backpack: [] }));
        }
        for (let i = 0; i < EQUIPMENT_HISTORY_LIMIT; i++) act(() => result.current.undo());
        expect(result.current.value.slots.helmet).toBe(5);
        expect(result.current.canUndo).toBe(false);
        result.current.value.backpack.push({ id: "mutated" });
        act(() => result.current.redo());
        act(() => result.current.undo());
        expect(result.current.value.backpack).toEqual([]);
    });
});
