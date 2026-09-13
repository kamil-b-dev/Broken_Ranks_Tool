import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useGearSlotDragDrop } from "./useGearSlotDragDrop";

const eventFor = (data) => ({
    preventDefault: vi.fn(),
    dataTransfer: { getData: vi.fn(() => JSON.stringify(data)) },
});

const createProps = (overrides = {}) => ({
    selectedItem: "7",
    slotKey: "weapon",
    availableOrbs1: [{ id: 2 }],
    availableOrbs2: [],
    maxDrifs: 2,
    maxDrifIndex: 1,
    elementalTypes: ["DAMAGE_FIRE"],
    hasGlobalElemental: false,
    setSelectedItem: vi.fn(),
    setBuiltInLvls: vi.fn(),
    setOrbSlots: vi.fn(),
    setSelectedDrifs: vi.fn(),
    setDrifTypes: vi.fn(),
    setDrifLevels: vi.fn(),
    ...overrides,
});

describe("useGearSlotDragDrop", () => {
    it("resets upgrades when a new item is dropped", () => {
        const props = createProps();
        const { result } = renderHook(() => useGearSlotDragDrop(props));

        act(() => result.current.handleDrop(eventFor({ dragType: "items", id: 9 }), "item"));

        expect(props.setSelectedItem).toHaveBeenCalledWith("9");
        expect(props.setBuiltInLvls).toHaveBeenCalledWith([1, 1]);
        expect(props.setSelectedDrifs).toHaveBeenCalledWith([]);
        expect(props.setOrbSlots).toHaveBeenCalled();
    });

    it("rejects unavailable orbs and elemental drifs used in another slot", () => {
        const props = createProps({ hasGlobalElemental: true });
        const { result } = renderHook(() => useGearSlotDragDrop(props));

        act(() => result.current.handleDrop(eventFor({ dragType: "orbs", id: 99 }), "orb1"));
        act(() =>
            result.current.handleDrop(
                eventFor({ dragType: "drifs", id: 3, size: "BIDRIF", bonusType: "DAMAGE_FIRE" }),
                "drif-0"
            )
        );

        expect(props.setOrbSlots).not.toHaveBeenCalled();
        expect(props.setSelectedDrifs).not.toHaveBeenCalled();
    });
});
