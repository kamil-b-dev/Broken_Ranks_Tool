import { describe, expect, it } from "vitest";
import { createEquipmentComparisonRows, summarizeLocalBuild } from "./buildComparisonData";

const build = (id, itemId) => ({
    id,
    payload: {
        build: {
            characterConfig: { level: 140 },
            requestData: {
                slots: {
                    helmet: {
                        itemId,
                        itemStars: 5,
                        orbIds: [7],
                        drifIds: [8, 9],
                    },
                },
            },
        },
    },
    stats: { ATTACK: 100 },
});

describe("build comparison data", () => {
    it("summarizes equipment and marks slot differences", () => {
        const left = build("a", 1);
        const right = build("b", 2);
        const rows = createEquipmentComparisonRows(
            [left, right],
            [
                { id: 1, name: "Hełm A", tier: "X" },
                { id: 2, name: "Hełm B", tier: "XI" },
            ]
        );

        expect(summarizeLocalBuild(left)).toMatchObject({
            equipped: 1,
            drifs: 2,
            orbs: 1,
            level: 140,
        });
        expect(rows.find((row) => row.key === "helmet")).toMatchObject({
            differs: true,
            values: [{ itemName: "Hełm A" }, { itemName: "Hełm B" }],
        });
    });
});
