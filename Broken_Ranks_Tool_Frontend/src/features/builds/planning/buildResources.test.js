import { describe, expect, it } from "vitest";
import { findMissingResources } from "./buildResources";

const data = {
    items: [{ id: 1, name: "Hełm" }],
    drifs: [
        { id: 2, name: "Drif", size: "BIDRIF", bonusType: "X" },
        { id: 3, name: "Większy", size: "MAGNIDRIF", bonusType: "X" },
    ],
    orbs: [],
};
describe("resources required by a target build", () => {
    it("does not treat built-in stones as loose resources and does report custom configuration", () => {
        const catalog = {
            ...data,
            items: [...data.items, { id: 4, name: "Epik", rarity: "EPIC" }],
        };
        const current = { slots: { weapon: { itemId: 4, drifIds: [2], drifLevels: { 0: 6 } } } };
        const target = {
            slots: {
                helmet: { itemId: 1, drifIds: [2], drifLevels: { 0: 6 } },
                ring1: { synergetic: { name: "res", stats: { PŻ: 300 } } },
            },
        };
        const result = findMissingResources(current, [], target, catalog);
        expect(result.find((row) => row.kind === "drif").status).toBe("missing");
        expect(result.find((row) => row.kind === "synergetic").status).toBe("configure");
    });
    it("counts equipped and loose stones once and does not reuse one occurrence", () => {
        const current = {
            slots: { helmet: { itemId: 1, itemStars: 1, drifIds: [2], drifLevels: { 0: 6 } } },
        };
        const target = {
            slots: {
                helmet: { itemId: 1, itemStars: 7, drifIds: [2, 2], drifLevels: { 0: 6, 1: 6 } },
            },
        };
        expect(findMissingResources(current, [], target, data)).toMatchObject([
            { kind: "item", status: "upgrade" },
            { kind: "drif", status: "owned" },
            { kind: "drif", status: "missing" },
        ]);
        expect(
            findMissingResources(
                current,
                [{ kind: "DRIF", templateId: 2, level: 6 }],
                target,
                data
            ).every((row) => row.status !== "missing")
        ).toBe(true);
        expect(current.slots.helmet.itemStars).toBe(1);
    });
    it("recognizes monotonic size/level upgrades and never suggests a downgrade", () => {
        const target = { slots: { helmet: { itemId: 1, drifIds: [3], drifLevels: { 0: 11 } } } };
        const result = findMissingResources(
            { slots: {} },
            [{ kind: "DRIF", templateId: 2, level: 6 }],
            target,
            data
        );
        expect(result.at(-1)).toMatchObject({ status: "upgrade", fromLevel: 6, level: 11 });
        expect(
            findMissingResources(
                { slots: {} },
                [{ kind: "DRIF", templateId: 3, level: 16 }],
                target,
                data
            ).at(-1).status
        ).toBe("missing");
    });
});
