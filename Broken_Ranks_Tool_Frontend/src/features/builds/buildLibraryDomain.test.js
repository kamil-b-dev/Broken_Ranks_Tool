import { describe, expect, it } from "vitest";
import {
    createDrifComposition,
    createEquipmentComparisonRows,
    createStatComparisonGroups,
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

    it("separates character, orb, and drif values into category groups", () => {
        const left = {
            ...build("a", 1, 100),
            stats: { ATTACK: 100, ORB_HP: 20, CRITICAL_CHANCE: 8, MANA_REGEN: 3 },
            statSources: {
                drifCategories: { CRITICAL_CHANCE: "OFFENSIVE", MANA_REGEN: "UTILITY" },
                orbBonusTypes: ["ORB_HP"],
            },
        };
        const right = {
            ...left,
            id: "b",
            stats: { ATTACK: 120, ORB_HP: 20, CRITICAL_CHANCE: 10, MANA_REGEN: 4 },
        };
        const groups = createStatComparisonGroups([left, right], {
            bonusTranslations: { ATTACK: "Atak" },
        });

        expect(groups.character.map((row) => row.key)).toEqual(["ATTACK"]);
        expect(groups.orbs.map((row) => row.key)).toEqual(["ORB_HP"]);
        expect(groups.drifs.OFFENSIVE.map((row) => row.key)).toEqual(["CRITICAL_CHANCE"]);
        expect(groups.drifs.UTILITY.map((row) => row.key)).toEqual(["MANA_REGEN"]);
    });

    it("finds the shared drif core and compares category and size distributions", () => {
        const left = build("a", 1, 100);
        left.payload.build.requestData.slots.helmet.drifIds = [8, 9, 9];
        left.payload.build.requestData.slots.helmet.drifLevels = { 0: 21, 1: 11, 2: 16 };
        const right = build("b", 2, 120);
        right.payload.build.requestData.slots.helmet.drifIds = [8, 10];
        right.payload.build.requestData.slots.helmet.drifLevels = { 0: 16, 1: 6 };
        const analysis = createDrifComposition(
            [left, right],
            [
                {
                    id: 8,
                    name: "Ling",
                    bonusType: "CRITICAL_CHANCE",
                    category: "OFFENSIVE",
                    size: "SUBDRIF",
                },
                {
                    id: 9,
                    name: "Teld",
                    bonusType: "DAMAGE_REDUCTION",
                    category: "DEFENSIVE",
                    size: "BIDRIF",
                },
                {
                    id: 10,
                    name: "Alom",
                    bonusType: "MANA_REGEN",
                    category: "UTILITY",
                    size: "MAGNIDRIF",
                },
            ]
        );

        expect(analysis.common).toMatchObject([
            { id: "8", name: "Ling", count: 1, minimumLevel: 16, maximumLevel: 21 },
        ]);
        expect(analysis.builds[0].categories.DEFENSIVE).toMatchObject({
            count: 2,
            sizes: { BIDRIF: 2 },
        });
        expect(analysis.outsideCommon[0].entries).toMatchObject([{ id: "9", count: 2 }]);
        expect(analysis.outsideCommon[1].entries).toMatchObject([{ id: "10", count: 1 }]);
    });
});
