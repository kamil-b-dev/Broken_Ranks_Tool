import { describe, expect, it } from "vitest";
import { createStatComparisonGroups, createStatComparisonRows } from "./statComparison";

const build = (id, attack) => ({
    id,
    stats: { ATTACK: attack, HP: 500 },
});

describe("stat comparison", () => {
    it("creates translated rows and identifies the highest value", () => {
        const rows = createStatComparisonRows([build("a", 100), build("b", 120)], {
            ATTACK: "Atak",
        });
        const attack = rows.find((row) => row.key === "ATTACK");

        expect(attack).toMatchObject({ label: "Atak", differs: true, highestIndexes: [1] });
        expect(rows.find((row) => row.key === "HP").differs).toBe(false);
    });

    it("separates character, orb, and drif values into category groups", () => {
        const left = {
            ...build("a", 100),
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
});
