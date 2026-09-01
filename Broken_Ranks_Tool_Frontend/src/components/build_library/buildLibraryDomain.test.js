import { describe, expect, it } from "vitest";
import {
    createEquipmentComparisonRows,
    createStatComparisonRows,
    summarizeLocalBuild,
} from "./buildLibraryDomain";

const build = (id, itemId, attack) => ({
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
    stats: { ATTACK: attack, HP: 500 },
});

describe("buildLibraryDomain", () => {
    it("summarizes equipment and marks slot differences", () => {
        const left = build("a", 1, 100);
        const right = build("b", 2, 120);
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

    it("creates translated statistic rows and identifies the highest value", () => {
        const rows = createStatComparisonRows([build("a", 1, 100), build("b", 2, 120)], {
            ATTACK: "Atak",
        });
        const attack = rows.find((row) => row.key === "ATTACK");

        expect(attack).toMatchObject({ label: "Atak", differs: true, highestIndexes: [1] });
        expect(rows.find((row) => row.key === "HP").differs).toBe(false);
    });
});
