import { describe, expect, it } from "vitest";
import { createReorganizationSequence } from "./reorganizationSequence";
import { builderCatalog } from "../../../test/fixtures/equipment/builderCatalog";

const stone = (itemId, id, level = 6) => ({
    itemId,
    itemStars: 1,
    drifIds: id ? [id] : [],
    drifLevels: id ? { 0: level } : {},
});
const data = {
    ...builderCatalog,
    drifs: [
        ...builderCatalog.drifs,
        { id: 61, name: "Regen", size: "SUBDRIF", bonusType: "MANA_REGEN" },
    ],
};
const gameRules = {
    ...builderCatalog.gameRules,
    drifBasePowers: { CRITICAL_CHANCE: 4, MANA_REGEN: 1 },
};
describe("executable reorganization instructions", () => {
    it("breaks a swap through temporary storage, never overwrites a socket and preserves the stone levels", () => {
        const before = { helmet: stone(1, 60, 2), armor: stone(2, 61, 6) };
        const after = { helmet: stone(1, 61, 6), armor: stone(2, 60, 2) };
        const usages = [
            { sourceSlotKey: "helmet", sourceDrifIndex: 0, slotKey: "armor", drifIndex: 0 },
            { sourceSlotKey: "armor", sourceDrifIndex: 0, slotKey: "helmet", drifIndex: 0 },
        ];
        const result = createReorganizationSequence({
            before,
            after,
            usages,
            backpack: [],
            data,
            gameRules,
        });
        expect(result.operations.map((op) => op.kind)).toEqual(["REMOVE", "MOVE", "INSERT"]);
        expect(result.extraSlotsNeeded).toBe(0);
        const board = new Map([
            ["helmet:0", "Band"],
            ["armor:0", "Regen"],
        ]);
        for (const operation of result.operations) {
            if (operation.from) {
                expect(board.get(operation.from)).toBe(operation.name);
                board.delete(operation.from);
            }
            if (operation.to) {
                expect(board.has(operation.to)).toBe(false);
                board.set(operation.to, operation.name);
            }
        }
        expect([...board.entries()].sort()).toEqual([
            ["armor:0", "Band"],
            ["helmet:0", "Regen"],
        ]);
        expect(result.operations.at(-1).level).toBe(2);
    });
    it("reports extra space needed for this instruction when the backpack is full", () => {
        const before = { helmet: stone(1, 60) },
            after = { helmet: stone(1, 61) };
        const backpack = [
            { id: "chosen", templateId: 61, level: 6 },
            ...Array.from({ length: 199 }, (_, i) => ({ id: String(i) })),
        ];
        const result = createReorganizationSequence({
            before,
            after,
            usages: [{ entryId: "chosen", slotKey: "helmet", drifIndex: 0 }],
            backpack,
            data,
            gameRules,
        });
        expect(result.extraSlotsNeeded).toBe(1);
        expect(result.operations.map((op) => op.kind)).toEqual(["REMOVE", "INSERT"]);
    });
    it("uses an empty destination directly without temporary storage", () => {
        const result = createReorganizationSequence({
            before: { helmet: stone(1, 60), armor: stone(2) },
            after: { helmet: stone(1), armor: stone(2, 60) },
            usages: [
                { sourceSlotKey: "helmet", sourceDrifIndex: 0, slotKey: "armor", drifIndex: 0 },
            ],
            backpack: [],
            data,
            gameRules,
        });
        expect(result.operations.map((op) => op.kind)).toEqual(["MOVE"]);
        expect(result.peakBackpackSlots).toBe(0);
    });
    it("places an upgraded stone at its original level and upgrades only in its final item", () => {
        const before = { helmet: stone(1, 60, 2), armor: stone(2) },
            after = { helmet: stone(1), armor: stone(2, 60, 6) };
        const result = createReorganizationSequence({
            before,
            after,
            usages: [
                { sourceSlotKey: "helmet", sourceDrifIndex: 0, slotKey: "armor", drifIndex: 0 },
            ],
            backpack: [],
            data,
            gameRules,
            options: {
                upgrades: [
                    {
                        sourceSlotKey: "helmet",
                        sourceDrifIndex: 0,
                        targetTemplateId: 60,
                        targetLevel: 6,
                    },
                ],
            },
        });
        expect(result.operations.map((op) => op.kind)).toEqual(["MOVE", "UPGRADE"]);
        expect(result.operations[0].level).toBe(2);
        expect(result.operations[1]).toMatchObject({ to: "armor:0", targetLevel: 6 });
    });
});
