import { act, render, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { HttpResponse, http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EquipmentProvider } from "../../app/EquipmentProvider";
import { useEquipment, useEquipmentBackpack } from "../../shared/state/EquipmentContext";
import { server } from "../../test/server";
import { builderCatalog } from "../../test/fixtures/equipment/builderCatalog";
import { useOptimizerWorkspace } from "./useOptimizerWorkspace";
import { DEFAULT_OPTIMIZER_SETTINGS } from "./optimizerDefaults";

const settings = {
    ...DEFAULT_OPTIMIZER_SETTINGS,
    configurationMode: "ADVANCED",
    backpackOnly: true,
};
const changeSettings = vi.fn();
const empty = { itemId: "1", itemStars: 1, orbIds: [], orbLevels: [], drifIds: [], drifLevels: {} };
const setup = {
    slots: { helmet: { ...empty, drifIds: ["60"], drifLevels: { 0: 6 } } },
    characterStats: {},
};

function WorkspaceProbe({ optimizerRef, settings }) {
    const workspace = useOptimizerWorkspace({
        optimizerSettings: settings,
        onOptimizerSettingsChange: changeSettings,
    });
    useEffect(() => {
        optimizerRef.current = workspace;
    }, [workspace, optimizerRef]);
    return null;
}
function Probe({ exposeRef, optimizerRef, settings }) {
    const equipment = useEquipment();
    const inventory = useEquipmentBackpack();
    useEffect(() => {
        exposeRef.current = { ...equipment, ...inventory };
    }, [equipment, inventory, exposeRef]);
    return equipment.loading ? null : (
        <WorkspaceProbe optimizerRef={optimizerRef} settings={settings} />
    );
}

describe("applying an owned backpack optimizer result", () => {
    beforeEach(() => {
        localStorage.clear();
        window.history.replaceState({}, "", "/optimizer");
        server.use(
            http.get("*/api/initial-data", () => HttpResponse.json(builderCatalog)),
            http.post("*/api/optimizer/drifs", () =>
                HttpResponse.json({
                    optimizedSetup: setup,
                    targetSetup: setup,
                    backpackDrifUsages: [{ entryId: "owned", slotKey: "helmet", drifIndex: 0 }],
                    summary: {
                        success: true,
                        outcome: "VALID_BUILD",
                        nextVariants: [
                            {
                                main: true,
                                bonusName: "Główny",
                                setup,
                                changes: [],
                                statChanges: [],
                            },
                        ],
                        goalResults: [],
                    },
                })
            )
        );
    });
    it.each([true, false])(
        "never reuses a consumed occurrence even when backpackOnly is now %s",
        async (backpackOnly) => {
            const exposeRef = { current: null };
            const optimizerRef = { current: null };
            const view = render(
                <EquipmentProvider>
                    <Probe exposeRef={exposeRef} optimizerRef={optimizerRef} settings={settings} />
                </EquipmentProvider>
            );
            await waitFor(() => expect(exposeRef.current?.loading).toBe(false));
            act(() => {
                exposeRef.current.handleSlotUpdate("helmet", empty);
                exposeRef.current.onBackpackChange([
                    { id: "owned", kind: "DRIF", templateId: "60", level: 6, sendToBackend: true },
                ]);
            });
            act(() => exposeRef.current.toggleDrifLock("helmet", 0));
            act(() => exposeRef.current.toggleDrifLock("helmet", 0));
            act(() => optimizerRef.current.selectBonus(optimizerRef.current.availableBonuses[0]));
            await act(async () => optimizerRef.current.handleOptimizeClick());
            expect(exposeRef.current.backpack).toEqual([]);
            expect(optimizerRef.current.displayedStatus).toMatchObject({
                applied: true,
                drifsPlaced: 1,
            });
            const variant = optimizerRef.current.optimizationStatus.nextVariants[0];
            const applied = structuredClone(exposeRef.current.requestData);
            act(() => optimizerRef.current.handleApplyVariant(variant, 0));
            expect(exposeRef.current.requestData).toEqual(applied);
            expect(exposeRef.current.backpack).toEqual([]);
            act(() =>
                expect(
                    exposeRef.current.equipmentRemoval.removeEquipment("DRIF", "helmet", "drif-0")
                ).toBe(true)
            );
            const backpack = structuredClone(exposeRef.current.backpack);
            expect(optimizerRef.current.displayedStatus.applied).toBe(false);
            view.rerender(
                <EquipmentProvider>
                    <Probe
                        exposeRef={exposeRef}
                        optimizerRef={optimizerRef}
                        settings={{ ...settings, backpackOnly }}
                    />
                </EquipmentProvider>
            );
            act(() => optimizerRef.current.handleApplyVariant(variant, 0));
            expect(exposeRef.current.requestData.slots.helmet.drifIds.filter(Boolean)).toEqual([]);
            expect(exposeRef.current.backpack).toEqual(backpack);
            expect(backpack).toEqual([expect.objectContaining({ templateId: "60", level: 6 })]);
            expect(optimizerRef.current.notice.message).toMatch(/Uruchom optymalizację ponownie/);
        }
    );
});
