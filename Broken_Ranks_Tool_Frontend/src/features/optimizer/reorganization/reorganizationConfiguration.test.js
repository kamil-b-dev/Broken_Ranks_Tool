import { describe, expect, it } from "vitest";
import { buildReorganizationConfiguration } from "./reorganizationConfiguration";
import { createEquipmentOptimizationRequest } from "../equipmentOptimizationRequest";
import {
    createOptimizerConfigPayload,
    parseOptimizerConfigPayload,
    mergeOptimizerSettings,
} from "../optimizerConfiguration";
import { builderCatalog } from "../../../test/fixtures/equipment/builderCatalog";

const data = {
    ...builderCatalog,
    drifs: [
        ...builderCatalog.drifs,
        { id: 61, name: "Wielki Band", bonusType: "CRITICAL_CHANCE", size: "MAGNIDRIF" },
        { id: 62, name: "Arcy Band", bonusType: "CRITICAL_CHANCE", size: "ARCYDRIF" },
    ],
};
const input = () => ({
    slots: { helmet: { itemId: 1, drifIds: [61, 60], drifLevels: { 0: 16, 1: 6 } } },
    data,
    lockedSlots: [],
    lockedDrifs: {},
    backpack: [{ id: "owned", kind: "DRIF", templateId: 60, level: 6, sendToBackend: true }],
});

describe("owned-pool task configuration", () => {
    it("uses the pool goal and excludes catalog-building preferences and backpack by default", () => {
        const state = input();
        const config = buildReorganizationConfiguration(
            { reorganization: {}, generateVariants: true, backpackOnly: true },
            state
        );
        const request = createEquipmentOptimizationRequest({
            slots: state.slots,
            configuration: config,
            backpack: state.backpack,
        });
        expect(request.reorganization).toMatchObject({
            task: "UPGRADE",
            allowUnequip: false,
            maxMoves: 50,
            protectedModifiers: {},
            upgrades: [
                {
                    sourceSlotKey: "helmet",
                    sourceDrifIndex: 0,
                    targetTemplateId: 62,
                    targetLevel: 21,
                },
            ],
        });
        expect(request.targetQuantities).toEqual({});
        expect(request.backpackDrifs).toEqual([]);
        expect(request.backpackSlotCount).toBe(1);
        expect(request.generateVariants).toBe(false);
    });
    it("identifies one occurrence and permits a size upgrade for level 21", () => {
        const state = input();
        const config = buildReorganizationConfiguration(
            {
                reorganization: {
                    task: "UPGRADE",
                    source: "helmet:0",
                    targetTemplateId: 62,
                    targetLevel: 21,
                    includeBackpack: true,
                },
            },
            state
        );
        expect(config.reorganization.upgrades[0]).toEqual({
            sourceSlotKey: "helmet",
            sourceDrifIndex: 0,
            targetTemplateId: 62,
            targetLevel: 21,
        });
        expect(
            createEquipmentOptimizationRequest({
                slots: state.slots,
                configuration: config,
                backpack: state.backpack,
            }).backpackDrifs
        ).toEqual([]);
        expect(config).not.toHaveProperty("includeBackpack");
    });
    it.each([
        { source: "armor:0" },
        { targetTemplateId: 60 },
        { targetLevel: 15 },
        { targetLevel: "" },
        { targetLevel: 22 },
    ])("rejects a missing occurrence or invalid upgrade: %j", (patch) => {
        expect(() =>
            buildReorganizationConfiguration(
                {
                    reorganization: {
                        task: "UPGRADE",
                        source: "helmet:0",
                        targetTemplateId: 62,
                        targetLevel: 21,
                        ...patch,
                    },
                },
                input()
            )
        ).toThrow();
    });
    it("rejects stale locked selection instead of switching to another stone", () => {
        const state = input();
        state.lockedDrifs = { helmet: [0] };
        expect(() =>
            buildReorganizationConfiguration(
                {
                    reorganization: {
                        task: "UPGRADE",
                        source: "helmet:0",
                        targetTemplateId: 62,
                        targetLevel: 21,
                    },
                },
                state
            )
        ).toThrow();
    });
    it("roundtrips the task, source, protections and explicit unequipping preference", () => {
        const settings = {
            mode: "REORGANIZE",
            reorganization: {
                task: "UPGRADE",
                source: "helmet:0",
                targetTemplateId: 62,
                targetLevel: 21,
                allowUnequip: true,
                maxMoves: 7,
                includeBackpack: true,
                protectedModifiers: { CRITICAL_CHANCE: { enabled: false, loss: 2 } },
            },
        };
        const parsed = parseOptimizerConfigPayload(
            createOptimizerConfigPayload([], settings),
            builderCatalog.gameRules
        );
        const { includeBackpack: obsolete, ...expected } = settings.reorganization;
        expect(obsolete).toBe(true);
        expect(mergeOptimizerSettings({}, parsed).reorganization).toMatchObject(expected);
        expect(parsed.reorganization).not.toHaveProperty("includeBackpack");
    });
    it("plans several distinct upgrade sources and rejects duplicates", () => {
        const settings = {
            reorganization: {
                task: "UPGRADE",
                upgrades: [
                    { source: "helmet:0", targetTemplateId: 62, targetLevel: 21 },
                    { source: "helmet:1", targetTemplateId: 62, targetLevel: 11 },
                ],
            },
        };
        expect(
            buildReorganizationConfiguration(settings, input()).reorganization.upgrades
        ).toHaveLength(2);
        settings.reorganization.upgrades[1].source = "helmet:0";
        expect(() => buildReorganizationConfiguration(settings, input())).toThrow();
    });
    it("includes the specifically chosen loose occurrence even when unselected", () => {
        const state = input();
        state.backpack[0].sendToBackend = false;
        state.backpack.push({ ...state.backpack[0], id: "another", sendToBackend: true });
        const config = buildReorganizationConfiguration(
            { reorganization: { task: "INSERT", insertEntryId: "owned" } },
            state
        );
        const request = createEquipmentOptimizationRequest({
            slots: state.slots,
            configuration: config,
            backpack: state.backpack,
        });
        expect(request.backpackDrifs).toEqual([{ id: "owned", templateId: 60, level: 6 }]);
        expect(request.reorganization.insertEntryId).toBe("owned");
        expect(request.reorganization.upgrades).toBeUndefined();
    });
    it.each(["UPGRADE", "RESERVE"])(
        "ignores old backpack options and stale insertion for %s",
        (task) => {
            const state = input();
            const request = createEquipmentOptimizationRequest({
                slots: state.slots,
                backpack: state.backpack,
                configuration: {
                    mode: "REORGANIZE",
                    includeBackpack: true,
                    reorganization: { task, insertEntryId: "owned" },
                },
            });
            expect(request.backpackDrifs).toEqual([]);
            expect(request.backpackSlotCount).toBe(1);
        }
    );
    it("validates independent socket and capacity targets", () => {
        const settings = {
            reorganization: {
                task: "RESERVE",
                reservation: { slotKey: "helmet", freeSockets: 1, freeCapacity: 8 },
            },
        };
        expect(
            buildReorganizationConfiguration(settings, input()).reorganization.reservation
        ).toEqual({ slotKey: "helmet", freeSockets: 1, freeCapacity: 8 });
        settings.reorganization.reservation.freeCapacity = 13;
        expect(() => buildReorganizationConfiguration(settings, input())).toThrow();
    });
    it.each([1, 50])("sends the selected move limit at the boundary %s", (maxMoves) => {
        const config = buildReorganizationConfiguration({ reorganization: { maxMoves } }, input());
        expect(config.reorganization.maxMoves).toBe(maxMoves);
        expect(config.reorganization).not.toHaveProperty("preferFewestMoves");
    });
    it.each([0, 51, 1.5, "", "invalid", true])("rejects an invalid move limit %s", (maxMoves) => {
        expect(() =>
            buildReorganizationConfiguration({ reorganization: { maxMoves } }, input())
        ).toThrow(/od 1 do 50/);
    });
    it("migrates the old ranking checkbox to the default move limit", () => {
        const parsed = parseOptimizerConfigPayload(
            createOptimizerConfigPayload([], {
                mode: "REORGANIZE",
                reorganization: { preferFewestMoves: false },
            }),
            builderCatalog.gameRules
        );
        const options = mergeOptimizerSettings({}, parsed).reorganization;
        expect(options.maxMoves).toBe(50);
        expect(options).not.toHaveProperty("preferFewestMoves");
    });
});
