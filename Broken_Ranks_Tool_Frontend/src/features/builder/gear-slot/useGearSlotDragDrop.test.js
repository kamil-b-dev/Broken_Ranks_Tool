import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { setDraggedResource } from "../useDraggedResource";
import { useGearSlotDragDrop } from "./useGearSlotDragDrop";

const eventFor = (data) => ({
    preventDefault: vi.fn(),
    dataTransfer: { getData: vi.fn(() => JSON.stringify(data)) },
});

const createProps = (overrides = {}) => ({
    selectedItem: "7",
    items: [{ id: 9 }],
    slotKey: "weapon",
    availableOrbs1: [{ id: 2 }],
    availableOrbs2: [],
    maxDrifs: 2,
    maxDrifIndex: 1,
    elementalTypes: ["DAMAGE_FIRE", "DAMAGE_FROST"],
    drifs: [
        { id: 3, size: "BIDRIF", bonusType: "DAMAGE_FIRE" },
        { id: 4, size: "BIDRIF", bonusType: "DAMAGE_FROST" },
    ],
    selectedDrifs: [4],
    setSelectedItem: vi.fn(),
    setBuiltInLvls: vi.fn(),
    setOrbSlots: vi.fn(),
    setSelectedDrifs: vi.fn(),
    setDrifTypes: vi.fn(),
    setDrifLevels: vi.fn(),
    ...overrides,
});

describe("useGearSlotDragDrop", () => {
    beforeEach(() => setDraggedResource(null));

    it("rejects an over-capacity drif both when highlighting and when dropping", () => {
        const props = createProps({
            selectedDrifs: [],
            itemCapacity: 1,
            drifBasePowers: { DAMAGE_FIRE: 2 },
        });
        const payload = { dragType: "drifs", id: 3 };
        const { result } = renderHook(() => useGearSlotDragDrop(props));
        act(() => setDraggedResource(payload));

        expect(result.current.isDropEligible("drif-0")).toBe(false);
        const dragOver = eventFor(payload);
        act(() => result.current.handleDragOver(dragOver, "drif-0"));
        expect(dragOver.preventDefault).not.toHaveBeenCalled();
        act(() => result.current.handleDrop(eventFor(payload), "drif-0"));

        expect(props.setSelectedDrifs).not.toHaveBeenCalled();
        expect(props.setDrifTypes).not.toHaveBeenCalled();
        expect(props.setDrifLevels).not.toHaveBeenCalled();
    });

    it("accepts a drif at capacity and uses its catalog metadata", () => {
        const props = createProps({
            selectedDrifs: [],
            itemCapacity: 2,
            drifBasePowers: { DAMAGE_FIRE: 2 },
            drifs: [{ id: 3, name: "Katalogowy drif", size: "BIDRIF", bonusType: "DAMAGE_FIRE" }],
        });
        const payload = { dragType: "drifs", id: "3", name: "Obca nazwa", bonusType: "ARMOR" };
        const { result } = renderHook(() => useGearSlotDragDrop(props));
        act(() => setDraggedResource(payload));
        expect(result.current.isDropEligible("drif-0")).toBe(true);
        act(() => result.current.handleDrop(eventFor(payload), "drif-0"));

        expect(props.setSelectedDrifs.mock.calls[0][0]([])).toEqual(["3"]);
        expect(props.setDrifTypes.mock.calls[0][0]({})).toEqual({ 0: "Katalogowy drif" });
        expect(props.setDrifLevels.mock.calls[0][0]({})).toEqual({ 0: 1 });
    });

    it.each([
        ["unknown id", { id: 99 }, {}],
        [
            "forged size",
            { id: 3, size: "SUBDRIF" },
            { drifs: [{ id: 3, size: "ARCYDRIF", bonusType: "CRITICAL_CHANCE" }] },
        ],
        ["forged elemental type", { id: 3, bonusType: "ARMOR" }, { slotKey: "helmet" }],
    ])("rejects %s using the current catalog", (_reason, data, overrides) => {
        const props = createProps({ selectedDrifs: [], ...overrides });
        const payload = { dragType: "drifs", ...data };
        const { result } = renderHook(() => useGearSlotDragDrop(props));
        act(() => setDraggedResource(payload));

        expect(result.current.isDropEligible("drif-0")).toBe(false);
        act(() => result.current.handleDrop(eventFor(payload), "drif-0"));
        expect(props.setSelectedDrifs).not.toHaveBeenCalled();
    });

    it("resets upgrades when a new item is dropped", () => {
        const props = createProps();
        const { result } = renderHook(() => useGearSlotDragDrop(props));

        act(() => result.current.handleDrop(eventFor({ dragType: "items", id: 9 }), "item"));

        expect(props.setSelectedItem).toHaveBeenCalledWith("9");
        expect(props.setBuiltInLvls).toHaveBeenCalledWith([1, 1]);
        expect(props.setSelectedDrifs).toHaveBeenCalledWith([]);
        expect(props.setOrbSlots).toHaveBeenCalled();
    });

    it("rejects unavailable orbs and a second elemental drif in the weapon", () => {
        const props = createProps();
        const { result } = renderHook(() => useGearSlotDragDrop(props));

        act(() => result.current.handleDrop(eventFor({ dragType: "orbs", id: 99 }), "orb1"));
        act(() =>
            result.current.handleDrop(
                eventFor({ dragType: "drifs", id: 3, size: "BIDRIF", bonusType: "DAMAGE_FIRE" }),
                "drif-1"
            )
        );

        expect(props.setOrbSlots).not.toHaveBeenCalled();
        expect(props.setSelectedDrifs).not.toHaveBeenCalled();
    });
    it("rejects items outside the slot's filtered catalog", () => {
        const props = createProps();
        const { result } = renderHook(() => useGearSlotDragDrop(props));
        act(() => result.current.handleDrop(eventFor({ dragType: "items", id: 99 }), "item"));
        expect(props.setSelectedItem).not.toHaveBeenCalled();
    });

    it("rejects duplicate ordinary bonus types and positions outside active sockets", () => {
        const props = createProps({
            drifs: [
                { id: 3, size: "BIDRIF", bonusType: "CRITICAL_CHANCE" },
                { id: 4, size: "BIDRIF", bonusType: "CRITICAL_CHANCE" },
            ],
            selectedDrifs: [4],
        });
        const { result } = renderHook(() => useGearSlotDragDrop(props));
        for (const zone of ["drif-1", "drif-2", "drif--1", "drif-1x"]) {
            act(() =>
                result.current.handleDrop(
                    eventFor({
                        dragType: "drifs",
                        id: 3,
                        size: "BIDRIF",
                        bonusType: "CRITICAL_CHANCE",
                    }),
                    zone
                )
            );
        }
        expect(props.setSelectedDrifs).not.toHaveBeenCalled();
        act(() =>
            result.current.handleDrop(
                eventFor({
                    dragType: "drifs",
                    id: 3,
                    size: "BIDRIF",
                    bonusType: "CRITICAL_CHANCE",
                }),
                "drif-0"
            )
        );
        expect(props.setSelectedDrifs).toHaveBeenCalledOnce();
    });
});
