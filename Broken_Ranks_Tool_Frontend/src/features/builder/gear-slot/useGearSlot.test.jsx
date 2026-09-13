import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGearSlot } from "./useGearSlot";

const items = [
    { id: 1, name: "Miecz X", tier: "X", rarity: "LEGENDARY", capacity: 4 },
    { id: 2, name: "Zbroja II", tier: "II", rarity: "COMMON", capacity: 2 },
    { id: 3, name: "Hełm X", tier: "X", rarity: "EPIC", capacity: 0 },
];
const orbs = [
    { id: 10, name: "Atak", bonusType: "ATTACK", category: "OFFENSIVE", tier: "I" },
    { id: 11, name: "Kryt", bonusType: "CRIT", category: "OFFENSIVE", tier: "X" },
    { id: 12, name: "Mana", bonusType: "MANA", category: "DEFENSIVE", tier: "I" },
];
const drifs = [
    { id: 20, name: "Siła", bonusType: "STRENGTH", size: "SUBDRIF" },
    { id: 21, name: "Ogień", bonusType: "FIRE", size: "SUBDRIF" },
    { id: 22, name: "Kryt", bonusType: "CRIT", size: "MAGNIDRIF" },
    { id: 23, name: "Potęga", bonusType: "POWER", size: "ARCYDRIF" },
];
const gameRules = {
    slotOrbRules: { weapon: ["OFFENSIVE"], armor: ["DEFENSIVE"] },
    elementalTypes: ["FIRE"],
    drifBasePowers: { STRENGTH: 2, FIRE: 3 },
    epicBuiltInDrifs: { Hełm: ["CRIT"] },
    bonusTranslations: { CRIT: "Krytyk" },
};

const drop = (result, data, zone) =>
    act(() =>
        result.current.handleDrop(
            {
                preventDefault: vi.fn(),
                dataTransfer: { getData: () => JSON.stringify(data) },
            },
            zone
        )
    );

const renderSlot = (overrides = {}) => {
    const onUpdate = vi.fn();
    const props = {
        slotKey: "weapon",
        items,
        orbs,
        drifs,
        allSlots: {},
        gameRules,
        onUpdate,
        optimizationTrigger: 0,
        ...overrides,
    };
    return { ...renderHook(() => useGearSlot(props)), onUpdate };
};

describe("useGearSlot", () => {
    beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => {}));

    it("starts empty and exposes safe grouping and drag state", () => {
        const { result } = renderSlot();
        expect(result.current.fullSelectedItem).toBeUndefined();
        expect(result.current.maxDrifs).toBe(0);
        expect(result.current.maxDrifIndex).toBe(-1);
        expect(result.current.groupByType(null)).toEqual({});
        expect(
            result.current.groupByType([
                { name: "Nazwa", id: 1 },
                { description: "Opis", id: 2 },
                { bonusType: "BONUS", id: 3 },
                { id: 4 },
            ])
        ).toEqual({
            Nazwa: [{ name: "Nazwa", id: 1 }],
            Opis: [{ description: "Opis", id: 2 }],
            BONUS: [{ bonusType: "BONUS", id: 3 }],
        });

        act(() => result.current.handleDragOver({ preventDefault: vi.fn() }, "item"));
        expect(result.current.dragOverZone).toBe("item");
        act(() => result.current.handleDragLeave());
        expect(result.current.dragOverZone).toBeNull();
        act(() =>
            result.current.handleDrop(
                { preventDefault: vi.fn(), dataTransfer: { getData: () => "invalid" } },
                "item"
            )
        );
        expect(console.error).toHaveBeenCalled();
    });

    it("configures a legendary item with unique orbs and powered drifs", async () => {
        const { result, onUpdate } = renderSlot();
        drop(result, { ...items[0], dragType: "items" }, "item");

        expect(result.current.isLegendary).toBe(true);
        expect(result.current.maxDrifs).toBe(3);
        expect(result.current.maxDrifIndex).toBe(3);
        expect(Object.keys(result.current.groupedOrbs1)).toEqual(["Atak", "Kryt"]);

        act(() => result.current.setItemStars(9));
        expect(result.current.itemCapacity).toBe(8);
        drop(result, { ...orbs[0], dragType: "orbs" }, "orb1");
        drop(result, { ...orbs[1], dragType: "orbs" }, "orb2");
        drop(result, { ...drifs[0], dragType: "drifs" }, "drif-0");
        act(() => result.current.setDrifLevels({ 0: 17 }));

        expect(result.current.currentPowerUsed).toBe(8);
        expect(result.current.isAtMaxCapacity).toBe(true);
        expect(result.current.capacityPercentage).toBe(100);
        await waitFor(() =>
            expect(onUpdate).toHaveBeenLastCalledWith(
                "weapon",
                expect.objectContaining({
                    itemId: "1",
                    itemStars: 9,
                    orbIds: ["10", "11"],
                    orbLevels: [1, 1],
                    drifIds: ["20", "", ""],
                    drifLevels: { 0: 17 },
                })
            )
        );

        act(() => result.current.setDrifLevels({ 0: 21 }));
        expect(result.current.isOverCapacity).toBe(false);
        drop(result, { ...drifs[1], dragType: "drifs" }, "drif-1");
        expect(result.current.isOverCapacity).toBe(true);
    });

    it("rejects invalid or globally used upgrades", () => {
        const allSlots = {
            armor: { orbIds: [10], drifIds: [21] },
        };
        const { result } = renderSlot({ allSlots });
        drop(result, { ...items[0], dragType: "items" }, "item");

        expect(result.current.groupedOrbs1.Atak).toBeUndefined();
        drop(result, { ...orbs[0], dragType: "orbs" }, "orb1");
        expect(result.current.orbSlots.orb1.id).toBe("");
        drop(result, { ...drifs[1], dragType: "drifs" }, "drif-0");
        expect(result.current.selectedDrifs).toEqual([]);
        drop(result, { ...drifs[3], size: "UNKNOWN", dragType: "drifs" }, "drif-0");
        expect(result.current.selectedDrifs).toEqual([]);
    });

    it("synchronizes imported data and clears it when optimization removes a slot", () => {
        const imported = {
            weapon: {
                itemId: 1,
                itemStars: 7,
                orbIds: [10],
                orbLevels: [5],
                drifIds: [20, null, 999],
                drifLevels: [6],
            },
        };
        const onUpdate = vi.fn();
        const baseProps = {
            slotKey: "weapon",
            items,
            orbs,
            drifs,
            gameRules,
            onUpdate,
        };
        const { result, rerender } = renderHook(
            ({ allSlots, optimizationTrigger }) =>
                useGearSlot({ ...baseProps, allSlots, optimizationTrigger }),
            { initialProps: { allSlots: imported, optimizationTrigger: 1 } }
        );

        expect(result.current.selectedItem).toBe("1");
        expect(result.current.itemStars).toBe(7);
        expect(result.current.orbSlots.orb1).toEqual({ id: "10", level: "5", type: "Atak" });
        expect(result.current.drifLevels).toEqual({ 0: 6, 2: 21 });

        rerender({ allSlots: { armor: {} }, optimizationTrigger: 2 });
        expect(result.current.selectedItem).toBe("");
        expect(result.current.selectedDrifs).toEqual([]);
    });

    it("adds built-in translated drifs to epic items", async () => {
        const { result, onUpdate } = renderSlot();
        drop(result, { ...items[2], dragType: "items" }, "item");

        expect(result.current.isEpicOrSet).toBe(true);
        expect(result.current.maxDrifs).toBe(0);
        expect(result.current.builtInDrifs).toEqual([
            { id: 22, bonusType: "CRIT", displayName: "Krytyk" },
        ]);
        act(() => result.current.setBuiltInLvls([12, 1]));
        await waitFor(() =>
            expect(onUpdate).toHaveBeenLastCalledWith(
                "weapon",
                expect.objectContaining({ drifIds: [22], drifLevels: { 0: 12 } })
            )
        );
    });
});
