import { act, render, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { useLayoutEffect } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { EquipmentProvider } from "./EquipmentProvider";
import {
    useEquipment,
    useEquipmentBackpack,
    useEquipmentHistoryState,
} from "../shared/state/EquipmentContext";
import { server } from "../test/server";
import { readEquipmentDraft, writeEquipmentDraft } from "./storage/workingDraftStorage";
import legacyBuild from "../test/fixtures/builds/legacy-epic-build.json";
import catalog from "../test/fixtures/builds/legacy-epic-catalog.json";

async function setup() {
    server.use(
        http.get("*/api/initial-data", () => HttpResponse.json(catalog)),
        http.post("*/api/calculator/calculate", async ({ request }) => {
            const input = await request.json();
            return HttpResponse.json({ stats: { Moc: input.characterStats?.Moc ?? 0 } });
        })
    );
    let current;
    function Probe() {
        const equipment = useEquipment();
        const backpack = useEquipmentBackpack();
        const history = useEquipmentHistoryState();
        useLayoutEffect(() => {
            current = { ...equipment, ...backpack, ...history };
        });
        return null;
    }
    render(
        <EquipmentProvider>
            <Probe />
        </EquipmentProvider>
    );
    await waitFor(() => expect(current.loading).toBe(false));
    return () => current;
}

describe("shared equipment history", () => {
    beforeEach(() => localStorage.clear());

    it("undoes equipping an owned item as one transaction without duplicating the owned instance", async () => {
        const state = await setup();
        const entry = {
            id: "owned-helmet",
            kind: "ITEM",
            equipment: structuredClone(legacyBuild.build.requestData.slots.helmet),
        };
        act(() => state().onBackpackChange([entry]));
        const inventory = structuredClone(state().backpack);
        act(() => expect(state().equipBackpackEntry("owned-helmet", "helmet")).toBe(true));
        expect(state().backpack).toEqual([]);
        expect(state().requestData.slots.helmet.itemId).toBe(inventory[0].equipment.itemId);
        act(() => state().undo());
        expect(state().requestData.slots).toEqual({});
        expect(state().backpack).toEqual(inventory);
        act(() => state().redo());
        expect(state().backpack).toEqual([]);
        expect(state().requestData.slots.helmet).toEqual(inventory[0].equipment);
    });

    it("restores an imported build, inventory, character configuration and locks atomically", async () => {
        const state = await setup();
        expect(state().canUndo).toBe(false);
        await act(async () => {
            await state().loadBuildSnapshot({ payload: legacyBuild });
        });
        const imported = structuredClone({
            requestData: state().requestData,
            characterConfig: state().characterConfig,
            lockedSlots: state().lockedSlots,
            lockedDrifs: state().lockedDrifs,
            backpack: state().backpack,
        });
        expect(state().canUndo).toBe(true);
        act(() => state().undo());
        expect(state().requestData).toEqual({ slots: {}, characterStats: {} });
        expect(state().characterConfig).toBeNull();
        expect(state().lockedDrifs).toEqual({});
        expect(state().canUndo).toBe(false);
        act(() => state().redo());
        for (const key of Object.keys(imported)) expect(state()[key]).toEqual(imported[key]);
        await waitFor(() => expect(readEquipmentDraft().requestData).toEqual(imported.requestData));
    });

    it("undoes slot fields, point allocation, locks and backpack edits without resurrecting redo after a new edit", async () => {
        const state = await setup();
        const slot = {
            itemId: 7,
            itemStars: 9,
            orbIds: [3],
            orbLevels: [2],
            drifIds: [4],
            drifLevels: { 0: 6 },
        };
        act(() => state().handleSlotUpdate("helmet", slot));
        act(() =>
            state().handleCharacterStatsUpdate(
                { Moc: 42 },
                { level: 12, spentPoints: { power: 32 } }
            )
        );
        act(() => state().toggleSlotLock("helmet"));
        act(() => state().toggleDrifLock("helmet", 0));
        act(() =>
            state().onBackpackChange([{ id: "owned", kind: "DRIF", templateId: "999", level: 1 }])
        );
        act(() => state().undo());
        expect(state().backpack).toEqual([]);
        act(() => state().undo());
        expect(state().lockedDrifs).toEqual({});
        act(() => state().undo());
        expect(state().lockedSlots).toEqual([]);
        act(() => state().undo());
        expect(state().requestData.characterStats).toEqual({});
        expect(state().characterConfig).toBeNull();
        act(() => state().undo());
        expect(state().requestData.slots).toEqual({});
        act(() => state().redo());
        expect(state().requestData.slots.helmet).toEqual(slot);
        act(() => state().toggleSlotLock("boots"));
        expect(state().canRedo).toBe(false);
    });

    it("does not record draft restoration and ignores an import finishing after undo and redo", async () => {
        writeEquipmentDraft({
            requestData: { slots: {}, characterStats: { Moc: 12 } },
            characterConfig: null,
            lockedSlots: [],
            lockedDrifs: {},
        });
        const state = await setup();
        expect(state().canUndo).toBe(false);
        act(() => state().handleCharacterStatsUpdate({ Moc: 30 }));
        let resolveFile;
        const text = new Promise((resolve) => {
            resolveFile = resolve;
        });
        let pending;
        await act(async () => {
            pending = state().loadBuildFromFile({ size: 100, text: () => text });
        });
        act(() => state().undo());
        act(() => state().redo());
        await act(async () => {
            resolveFile(JSON.stringify(legacyBuild));
            expect(await pending).toBe(false);
        });
        expect(state().requestData.characterStats).toEqual({ Moc: 30 });
        expect(state().requestData.slots).toEqual({});
        await waitFor(() => expect(state().stats).toEqual({ Moc: 30 }));
    });
});
