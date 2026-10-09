import { describe, expect, it } from "vitest";
import { createStatComparisonGroups } from "./statComparison";

const build = (id, attack) => ({
    id,
    stats: { ATTACK: attack, HP: 500 },
});

describe("stat comparison", () => {
    it("creates translated rows and identifies the highest value", () => {
        const rows = createStatComparisonGroups([build("a", 100), build("b", 120)], {
            bonusTranslations: { ATTACK: "Atak" },
        }).character;
        const attack = rows.find((row) => row.key === "ATTACK");

        expect(attack).toMatchObject({ label: "Atak", differs: true, highestIndexes: [1] });
        expect(rows.find((row) => row.key === "HP").differs).toBe(false);
    });

    it("highlights stronger negative reductions while preserving their displayed values", () => {
        const groups = createStatComparisonGroups(
            ["-5%", "-20%"].map((value) => ({ stats: { MANA_USAGE_REDUCTION: value } }))
        );
        expect(groups.drifs.UTILITY[0]).toMatchObject({
            values: ["-5%", "-20%"],
            highestIndexes: [1],
        });
    });

    it("treats effects above positive and negative caps as equally useful", () => {
        const groups = createStatComparisonGroups(
            [
                { stats: { CRITICAL_CHANCE: "64%", MANA_USAGE_REDUCTION: "-80%" } },
                { stats: { CRITICAL_CHANCE: "62%", MANA_USAGE_REDUCTION: "-60%" } },
                { stats: { CRITICAL_CHANCE: "59%", MANA_USAGE_REDUCTION: "-40%" } },
            ],
            { drifMaxCaps: { CRITICAL_CHANCE: 60, MANA_USAGE_REDUCTION: -60 } }
        );
        expect(groups.drifs.OFFENSIVE[0].highestIndexes).toEqual([0, 1]);
        expect(groups.drifs.UTILITY[0].highestIndexes).toEqual([0, 1]);
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
