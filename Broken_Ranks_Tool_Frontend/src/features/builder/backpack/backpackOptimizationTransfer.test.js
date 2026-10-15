import { describe, expect, it } from "vitest";
import { applyBackpackOptimization } from "./backpackOptimizationTransfer";
import { builderCatalog } from "../../../test/fixtures/equipment/builderCatalog";
const slot = (id, level) => ({ itemId: 1, drifIds: [id], drifLevels: { 0: level } });
const stone = { id: "owned", kind: "DRIF", templateId: "60", level: 6, sendToBackend: true };
const usage = { entryId: "owned", slotKey: "helmet", drifIndex: 0 };
describe("applying final backpack substitutions", () => {
    it.each([
        { helmet: { ...slot(60, 6), itemStars: 9 } },
        { helmet: { ...slot(60, 6), orbIds: [50], orbLevels: [1] } },
        { helmet: { ...slot(60, 6), itemId: 2 } },
        { helmet: slot(60, 6), boots: { itemId: 5 } },
        { helmet: slot(60, 6), unknown: { itemId: null } },
        {},
    ])("rejects out-of-scope changes without consuming inventory: %j", (nextSlots) => {
        const backpack = [stone];
        expect(() =>
            applyBackpackOptimization({
                backpack,
                previousSlots: { helmet: slot(60, 2) },
                nextSlots,
                backpackDrifUsages: [],
            })
        ).toThrow();
        expect(backpack).toEqual([stone]);
    });
    it("rejects changed locked levels even when no backpack usage was reported", () => {
        const input = {
            backpack: [stone],
            previousSlots: { helmet: slot(60, 2) },
            nextSlots: { helmet: slot(60, 6) },
            backpackDrifUsages: [],
        };
        expect(() => applyBackpackOptimization({ ...input, lockedSlots: ["helmet"] })).toThrow(
            /blokadę/
        );
        expect(() => applyBackpackOptimization({ ...input, lockedDrifs: { helmet: [0] } })).toThrow(
            /blokadę/
        );
        expect(applyBackpackOptimization({ ...input, builtInSlots: ["helmet"] })).toEqual([stone]);
    });
    it("validates physical capacity and the target kind and size before transferring a matched stone", () => {
        const equipment = { ...slot(60, 2), itemStars: 1, orbIds: [], orbLevels: [] };
        const input = {
            backpack: [stone],
            previousSlots: { helmet: equipment },
            nextSlots: { helmet: { ...equipment, drifLevels: { 0: 6 } } },
            backpackDrifUsages: [usage],
            targetSlots: { helmet: { ...equipment, drifLevels: { 0: 6 } } },
            data: builderCatalog,
        };
        expect(applyBackpackOptimization(input)).toHaveLength(1);
        expect(() =>
            applyBackpackOptimization({
                ...input,
                data: {
                    ...builderCatalog,
                    items: builderCatalog.items.map((item) => ({ ...item, capacity: 1 })),
                },
            })
        ).toThrow(/pojemność/);
        const data = {
            ...builderCatalog,
            drifs: [
                ...builderCatalog.drifs,
                { ...builderCatalog.drifs[0], id: 61, size: "ARCYDRIF" },
            ],
        };
        expect(() =>
            applyBackpackOptimization({ ...input, data, targetSlots: { helmet: slot(61, 11) } })
        ).toThrow(/rodzaju i rozmiaru/);
    });
    it("consumes the explicit occurrence and keeps unmatched catalog stones and identical copies", () => {
        const backpack = [
            stone,
            { ...stone, id: "other-selected" },
            { ...stone, id: "unselected", sendToBackend: false },
        ];
        const next = applyBackpackOptimization({
            backpack,
            previousSlots: { helmet: slot(60, 2), armor: { itemId: 2, drifIds: [] } },
            nextSlots: {
                helmet: slot(60, 6),
                armor: { itemId: 2, drifIds: [99], drifLevels: { 0: 21 } },
            },
            backpackDrifUsages: [usage],
        });
        expect(next).toHaveLength(3);
        expect(next.some((entry) => entry.id === "owned")).toBe(false);
        expect(next.find((entry) => entry.id === "other-selected")).toEqual(backpack[1]);
        expect(next.find((entry) => entry.id === "unselected")).toMatchObject({ level: 6 });
        expect(next.find((entry) => entry.level === 2)).toMatchObject({
            templateId: "60",
            level: 2,
        });
        expect(backpack).toHaveLength(3);
    });
    it("does not consume any matching copy when no substitution was reported", () => {
        expect(
            applyBackpackOptimization({
                backpack: [stone],
                previousSlots: { helmet: slot(null, 1) },
                nextSlots: { helmet: slot(60, 6) },
                backpackDrifUsages: [],
            })
        ).toEqual([stone]);
    });
    it.each([
        undefined,
        [usage, usage],
        [{ ...usage, entryId: "missing" }],
        [{ ...usage, drifIndex: -1 }],
        [{ ...usage, drifIndex: 1 }],
    ])("rejects missing or invalid occurrence mappings atomically", (backpackDrifUsages) => {
        const backpack = [stone];
        expect(() =>
            applyBackpackOptimization({
                backpack,
                previousSlots: { helmet: slot(60, 2) },
                nextSlots: { helmet: slot(60, 6) },
                backpackDrifUsages,
            })
        ).toThrow();
        expect(backpack).toEqual([stone]);
    });
    it("rejects changed levels, locked destinations and overflowing returns", () => {
        const input = {
            backpack: [stone],
            previousSlots: { helmet: slot(60, 2) },
            nextSlots: { helmet: slot(60, 5) },
            backpackDrifUsages: [usage],
        };
        expect(() => applyBackpackOptimization(input)).toThrow(/nie odpowiada/);
        expect(() =>
            applyBackpackOptimization({
                ...input,
                nextSlots: { helmet: slot(60, 6) },
                lockedDrifs: { helmet: [0] },
            })
        ).toThrow(/blokadę/);
        const full = Array.from({ length: 200 }, (_, index) => ({
            ...stone,
            id: `copy-${index}`,
            sendToBackend: false,
        }));
        expect(() =>
            applyBackpackOptimization({
                ...input,
                backpack: full,
                backpackDrifUsages: [],
                nextSlots: { helmet: slot(99, 21) },
            })
        ).toThrow(/200/);
    });
    it("keeps locked drifs without requiring or consuming a backpack occurrence", () => {
        expect(
            applyBackpackOptimization({
                backpack: [stone],
                previousSlots: { helmet: slot(60, 2) },
                nextSlots: { helmet: slot(60, 2) },
                lockedDrifs: { helmet: [0] },
                backpackDrifUsages: [],
            })
        ).toEqual([stone]);
    });
});
