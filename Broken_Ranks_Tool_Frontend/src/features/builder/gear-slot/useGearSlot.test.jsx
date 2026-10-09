import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGearSlot } from "./useGearSlot";

const items = [
    { id: 1, name: "Miecz X", tier: "X", rarity: "LEGENDARY", capacity: 4 },
    { id: 2, name: "Zbroja II", tier: "II", rarity: "COMMON", capacity: 2 },
    { id: 3, name: "Hełm X", tier: "X", rarity: "EPIC", capacity: 0 },
];
const orbs = [
    { id: 10, name: "Atak", bonusType: "ATTACK", category: "OFFENSIVE", size: "SUBORB" },
    { id: 11, name: "Kryt", bonusType: "CRIT", category: "OFFENSIVE", size: "ARCYORB" },
    { id: 12, name: "Mana", bonusType: "MANA", category: "DEFENSIVE", size: "SUBORB" },
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

    it("publishes only the new draft on import and clears an entirely empty imported build", () => {
        const onUpdate = vi.fn();
        const base = { slotKey: "weapon", items, orbs, drifs, gameRules, onUpdate };
        const { result, rerender } = renderHook((props) => useGearSlot({ ...base, ...props }), {
            initialProps: { allSlots: {}, optimizationTrigger: 0 },
        });
        act(() => result.current.setSelectedItem("1"));
        onUpdate.mockClear();
        rerender({ allSlots: { weapon: { itemId: 2, itemStars: 7 } }, optimizationTrigger: 1 });
        expect(onUpdate).toHaveBeenCalled();
        expect(
            onUpdate.mock.calls.every(([, slot]) => slot.itemId === "2" && slot.itemStars === 7)
        ).toBe(true);
        onUpdate.mockClear();
        rerender({ allSlots: {}, optimizationTrigger: 2 });
        expect(result.current.selectedItem).toBe("");
        expect(
            onUpdate.mock.calls.every(
                ([, slot]) => slot.itemId === null && slot.drifIds.length === 0
            )
        ).toBe(true);
    });

    it("keeps local edits when the provider acknowledges another slot", () => {
        const onUpdate = vi.fn();
        const base = {
            slotKey: "weapon",
            items,
            orbs,
            drifs,
            gameRules,
            onUpdate,
            optimizationTrigger: 0,
        };
        const { result, rerender } = renderHook(
            ({ allSlots }) => useGearSlot({ ...base, allSlots }),
            { initialProps: { allSlots: {} } }
        );
        act(() => result.current.setSelectedItem("1"));
        act(() => result.current.setItemStars((stars) => stars + 1));
        rerender({ allSlots: { armor: { itemId: 2 } } });
        expect(result.current.selectedItem).toBe("1");
        expect(result.current.itemStars).toBe(2);
    });

    it("never publishes empty defaults when mounting a saved mobile slot", () => {
        const saved = {
            itemId: 1,
            itemStars: 9,
            orbIds: [10, 11],
            orbLevels: [1, 3],
            drifIds: [20],
            drifLevels: { 0: 6 },
        };
        const { onUpdate, unmount } = renderSlot({
            allSlots: { weapon: saved },
        });
        expect(onUpdate).toHaveBeenCalled();
        for (const [, published] of onUpdate.mock.calls) {
            expect(published).toMatchObject({
                itemId: "1",
                itemStars: 9,
                orbIds: ["10", "11"],
                orbLevels: [1, 3],
                drifLevels: { 0: 6 },
            });
            expect(published.drifIds[0]).toBe("20");
        }
        unmount();
        const remounted = renderSlot({ allSlots: { weapon: saved } });
        expect(remounted.onUpdate.mock.calls[0][1].itemId).toBe("1");
    });

    it("initializes mobile built-in drif levels before the first publication", () => {
        const { onUpdate } = renderSlot({
            allSlots: { weapon: { itemId: 3, itemStars: 7, drifIds: [22], drifLevels: { 0: 13 } } },
        });
        for (const [, published] of onUpdate.mock.calls) {
            expect(published).toMatchObject({
                itemId: "3",
                itemStars: 7,
                drifIds: [22],
                drifLevels: { 0: 13 },
            });
        }
    });

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
        expect(result.current.isOverCapacity).toBe(false);
        expect(result.current.selectedDrifs).toEqual(["20"]);
        expect(result.current.currentPowerUsed).toBe(8);
    });

    it("rejects unknown drifs and globally used orbs", () => {
        const allSlots = {
            armor: { orbIds: [10], drifIds: [21] },
        };
        const { result } = renderSlot({ allSlots });
        drop(result, { ...items[0], dragType: "items" }, "item");

        expect(result.current.groupedOrbs1.Atak).toBeUndefined();
        drop(result, { ...orbs[0], dragType: "orbs" }, "orb1");
        expect(result.current.orbSlots.orb1.id).toBe("");
        drop(result, { id: 999, dragType: "drifs" }, "drif-0");
        expect(result.current.selectedDrifs).toEqual([]);
    });

    it("does not allow changing the primary orb to the secondary orb bonus", () => {
        const { result } = renderSlot();
        drop(result, { ...items[0], dragType: "items" }, "item");
        drop(result, { ...orbs[1], dragType: "orbs" }, "orb2");

        expect(result.current.availableOrbs1.map((orb) => orb.id)).not.toContain(11);
        drop(result, { ...orbs[1], dragType: "orbs" }, "orb1");
        expect(result.current.orbSlots.orb1.id).toBe("");
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
        expect(result.current.drifLevels).toEqual({ 0: 6, 2: 1 });

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

    it("keeps built-in drif levels when an epic slot is imported", async () => {
        const onUpdate = vi.fn();
        const imported = {
            weapon: {
                itemId: 3,
                itemStars: 8,
                drifIds: [22],
                drifLevels: { 0: 12 },
            },
        };

        const { result } = renderHook(() =>
            useGearSlot({
                slotKey: "weapon",
                items,
                orbs,
                drifs,
                allSlots: imported,
                gameRules,
                onUpdate,
                optimizationTrigger: 1,
            })
        );

        expect(result.current.builtInLvls).toEqual([12, 1]);
        await waitFor(() =>
            expect(onUpdate).toHaveBeenLastCalledWith(
                "weapon",
                expect.objectContaining({ drifIds: [22], drifLevels: { 0: 12 } })
            )
        );
    });
    it("counts only active ordinary sockets after lowering stars", () => {
        const { result, onUpdate } = renderSlot({
            items: items.map((item) => (item.id === 2 ? { ...item, capacity: 4 } : item)),
        });
        drop(result, { ...items[1], dragType: "items" }, "item");
        act(() => result.current.setItemStars(7));
        drop(result, { ...drifs[0], dragType: "drifs" }, "drif-0");
        drop(result, { ...drifs[1], dragType: "drifs" }, "drif-1");
        expect(result.current.currentPowerUsed).toBe(5);
        act(() => result.current.setItemStars(6));
        expect(result.current.currentPowerUsed).toBe(2);
        expect(result.current.isOverCapacity).toBe(false);
        act(() => result.current.setItemStars(7));
        expect(result.current.selectedDrifs).toEqual(["20"]);
        expect(result.current.currentPowerUsed).toBe(2);
        act(() => result.current.setItemStars(6));
        expect(onUpdate).toHaveBeenLastCalledWith(
            "weapon",
            expect.objectContaining({ drifIds: ["20"], drifLevels: { 0: 1 } })
        );
    });

    it("does not charge imported built-in drifs against ordinary capacity", () => {
        const { result } = renderSlot({
            allSlots: { weapon: { itemId: 3, drifIds: [22], drifLevels: { 0: 16 } } },
            optimizationTrigger: 1,
            gameRules: { ...gameRules, drifBasePowers: { CRIT: 4 } },
        });
        expect(result.current.currentPowerUsed).toBe(0);
        expect(result.current.isOverCapacity).toBe(false);
        expect(result.current.builtInLvls[0]).toBe(16);
    });
});
