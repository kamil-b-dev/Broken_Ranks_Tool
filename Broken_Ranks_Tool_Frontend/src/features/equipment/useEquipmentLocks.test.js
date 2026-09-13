import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useEquipmentLocks } from "./useEquipmentLocks";

describe("useEquipmentLocks", () => {
    it("toggles slot and drif locks independently", () => {
        const { result } = renderHook(() => useEquipmentLocks());

        act(() => result.current.toggleSlotLock("helmet"));
        act(() => result.current.toggleDrifLock("helmet", 0));
        act(() => result.current.toggleDrifLock("helmet", 2));
        expect(result.current.lockedSlots).toEqual(["helmet"]);
        expect(result.current.lockedDrifs).toEqual({ helmet: [0, 2] });

        act(() => result.current.toggleSlotLock("helmet"));
        act(() => result.current.toggleDrifLock("helmet", 0));
        expect(result.current.lockedSlots).toEqual([]);
        expect(result.current.lockedDrifs).toEqual({ helmet: [2] });
    });

    it("restores lock state from an imported build", () => {
        const { result } = renderHook(() => useEquipmentLocks());

        act(() => result.current.replaceLocks(["weapon"], { weapon: [1] }));

        expect(result.current.lockedSlots).toEqual(["weapon"]);
        expect(result.current.lockedDrifs).toEqual({ weapon: [1] });
    });
});
