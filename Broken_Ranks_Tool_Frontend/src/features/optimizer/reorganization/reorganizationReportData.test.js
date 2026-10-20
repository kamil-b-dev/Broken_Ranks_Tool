import { describe, expect, it } from "vitest";
import { builderCatalog } from "../../../test/fixtures/equipment/builderCatalog";
import { createReorganizationReport } from "./reorganizationReportData";

const slot = (itemId, drifIds = [], drifLevels = {}, itemStars = 1) => ({
    itemId,
    drifIds,
    drifLevels,
    itemStars,
});
const data = {
    ...builderCatalog,
    drifs: [
        ...builderCatalog.drifs,
        { id: 61, name: "Regen", bonusType: "MANA_REGEN", size: "SUBDRIF" },
        { id: 62, name: "Band", bonusType: "CRITICAL_CHANCE", size: "BIDRIF" },
    ],
};
const gameRules = { ...data.gameRules, drifBasePowers: { CRITICAL_CHANCE: 4, MANA_REGEN: 1 } };
const create = (input) =>
    createReorganizationReport({ data, gameRules, backpack: [], options: {}, ...input });

describe("reorganization report data", () => {
    it("reports the real destination and level for each upgraded source after moving it", () => {
        const input = {
            before: { helmet: slot(1, [60], { 0: 2 }), armor: slot(2, [61], { 0: 3 }) },
            after: { helmet: slot(1, [61], { 0: 6 }), armor: slot(2, [62], { 0: 11 }) },
            usages: [
                { sourceSlotKey: "helmet", sourceDrifIndex: 0, slotKey: "armor", drifIndex: 0 },
                { sourceSlotKey: "armor", sourceDrifIndex: 0, slotKey: "helmet", drifIndex: 0 },
            ],
            options: {
                upgrades: [
                    {
                        sourceSlotKey: "helmet",
                        sourceDrifIndex: 0,
                        targetTemplateId: 62,
                        targetLevel: 11,
                        maximizeLevel: true,
                    },
                    {
                        sourceSlotKey: "armor",
                        sourceDrifIndex: 0,
                        targetTemplateId: 61,
                        targetLevel: 6,
                    },
                ],
            },
        };
        const original = structuredClone(input);
        const result = create(input);
        expect(result.upgrades).toEqual([
            {
                name: "Band",
                targetName: "Band",
                before: 2,
                after: 11,
                destination: "Zbroja, gniazdo 1",
                maximizeLevel: true,
            },
            {
                name: "Regen",
                targetName: "Regen",
                before: 3,
                after: 6,
                destination: "Hełm, gniazdo 1",
                maximizeLevel: false,
            },
        ]);
        expect(result.capacities).toEqual([
            { slot: "Hełm", before: 4, after: 1, capacity: 12 },
            { slot: "Zbroja", before: 1, after: 8, capacity: 12 },
        ]);
        expect(
            result.sequence.operations
                .slice(-2)
                .map(({ kind, to, targetLevel }) => ({ kind, to, targetLevel }))
        ).toEqual([
            { kind: "UPGRADE", to: "armor:0", targetLevel: 11 },
            { kind: "UPGRADE", to: "helmet:0", targetLevel: 6 },
        ]);
        expect(input).toEqual(original);
    });
    it("returns only unused movable sources, preserving locks and built-in stones", () => {
        const catalog = {
            ...data,
            items: [...data.items, { ...data.items[2], id: 100, rarity: "EPIC" }],
        };
        const input = {
            data: catalog,
            before: {
                helmet: slot(1, [60, 61]),
                armor: slot(2, [61]),
                cape: slot(100, [60]),
                boots: slot(5, [61]),
            },
            after: {
                helmet: slot(1, [60]),
                armor: slot(2, [61]),
                cape: slot(100, [60]),
                boots: slot(5, [61]),
            },
            usages: [],
            options: {
                allowUnequip: true,
                lockedDrifs: { helmet: [0] },
                lockedSlots: ["armor", "boots"],
            },
        };
        const result = create(input);
        expect(result.moves).toEqual([{ name: "Regen", from: "Hełm, gniazdo 2", to: "Plecak" }]);
        expect(result.sequence.operations).toEqual([
            expect.objectContaining({ kind: "REMOVE", from: "helmet:1", temporary: false }),
        ]);
        expect(create({ ...input, options: {} }).moves).toEqual([]);
    });
    it("computes reserved sockets and capacity independently, including the extra star socket", () => {
        const lowTier = { ...data, items: [{ ...data.items[0], tier: "II", capacity: 8 }] };
        const result = create({
            data: lowTier,
            before: { helmet: slot(1, [60], { 0: 6 }, 7) },
            after: { helmet: slot(1, [60], { 0: 6 }, 7) },
            usages: [
                { sourceSlotKey: "helmet", sourceDrifIndex: 0, slotKey: "helmet", drifIndex: 0 },
            ],
            options: { reservation: { slotKey: "helmet", freeSockets: 1, freeCapacity: 5 } },
        });
        expect(result.reservationSummary).toEqual({
            label: "Hełm",
            freeSockets: 1,
            freeCapacity: 5,
        });
        expect(result.capacities).toEqual([{ slot: "Hełm", before: 4, after: 4, capacity: 9 }]);
        expect(result.moves).toEqual([]);
    });
    it("retains legacy upgrade support and omits a missing upgrade destination", () => {
        const input = {
            before: { helmet: slot(1, [60]) },
            after: { helmet: slot(1, [60], { 0: 6 }) },
            usages: [
                { sourceSlotKey: "helmet", sourceDrifIndex: 0, slotKey: "helmet", drifIndex: 0 },
            ],
            options: {
                upgrade: { sourceSlotKey: "helmet", sourceDrifIndex: 0, targetTemplateId: 60 },
            },
        };
        expect(create(input).upgrade).toMatchObject({ before: 1, after: 6 });
        expect(create({ ...input, usages: [] }).upgrades).toEqual([]);
    });
});
