import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { setDraggedResource } from "../useDraggedResource";
import { useGearSlotDragDrop } from "./useGearSlotDragDrop";

afterEach(() => act(() => setDraggedResource(null)));

it("highlights compatible destinations during a drag and clears them when it ends", () => {
    const { result } = renderHook(() =>
        useGearSlotDragDrop({
            selectedItem: "7",
            items: [{ id: 9 }],
            slotKey: "weapon",
            availableOrbs1: [{ id: 2 }],
            availableOrbs2: [],
            maxDrifs: 2,
            maxDrifIndex: 1,
            elementalTypes: [],
            drifs: [{ id: 3, size: "SUBDRIF", bonusType: "CRIT" }],
            selectedDrifs: [3],
            drifBasePowers: { CRIT: 2, HP: 2 },
            itemCapacity: 2,
            setSelectedItem: vi.fn(),
            setBuiltInLvls: vi.fn(),
            setOrbSlots: vi.fn(),
            setSelectedDrifs: vi.fn(),
            setDrifTypes: vi.fn(),
            setDrifLevels: vi.fn(),
        })
    );
    act(() => setDraggedResource({ id: 9, dragType: "items" }));
    expect(result.current.isDropEligible("item")).toBe(true);
    expect(result.current.isDropEligible("orb1")).toBe(false);
    act(() => setDraggedResource({ id: 2, dragType: "orbs" }));
    expect(result.current.isDropEligible("orb1")).toBe(true);
    expect(result.current.isDropEligible("orb2")).toBe(false);
    act(() => setDraggedResource({ id: 3, size: "SUBDRIF", bonusType: "CRIT", dragType: "drifs" }));
    expect(result.current.isDropEligible("drif-0")).toBe(true);
    expect(result.current.isDropEligible("drif-1")).toBe(false);
    act(() => setDraggedResource({ id: 4, size: "SUBDRIF", bonusType: "HP", dragType: "drifs" }));
    expect(result.current.isDropEligible("drif-1")).toBe(false);
    act(() => setDraggedResource({ id: 4, size: "SUBDRIF", bonusType: "CRIT", dragType: "drifs" }));
    expect(result.current.isDropEligible("drif-1")).toBe(false);
    act(() => setDraggedResource(null));
    expect(result.current.isDropEligible("drif-0")).toBe(false);
});
