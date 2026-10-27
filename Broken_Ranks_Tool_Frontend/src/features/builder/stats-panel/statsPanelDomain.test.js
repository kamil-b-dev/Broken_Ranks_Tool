import { describe, expect, it } from "vitest";
import { buildStatColumns, formatStatValue } from "./statsPanelDomain";

describe("statsPanelDomain", () => {
    it("summarizes ordinary and built-in drifs using catalog penalties, without counting orbs", () => {
        const columns = buildStatColumns({
            stats: { CRITICAL_CHANCE: "55%", MANA_REGEN: "5%" },
            gameRules: { drifPenaltyMultipliers: { 4: 0.91 } },
            requestData: {
                slots: {
                    helmet: { itemId: 1, drifIds: [10], orbIds: [10] },
                    armor: { itemId: 2, drifIds: [10] },
                    boots: { itemId: 3, drifIds: [10] },
                    weapon: { itemId: 4, drifIds: ["11"] },
                },
            },
            catalog: {
                items: [{ id: 4, rarity: "EPIC" }],
                drifs: [
                    { id: 10, bonusType: "CRITICAL_CHANCE", size: "ARCYDRIF" },
                    { id: 11, bonusType: "CRITICAL_CHANCE", size: "MAGNIDRIF" },
                ],
            },
        });
        const values = columns.flatMap(({ categories }) =>
            categories.flatMap(({ values }) => values)
        );
        expect(values.find(({ key }) => key === "CRITICAL_CHANCE").drifSummary).toEqual({
            count: 4,
            multiplier: 0.91,
            description: "Ilość drifów: 4 · Mnożnik: 0,91",
        });
        expect(values.find(({ key }) => key === "MANA_REGEN").drifSummary).toEqual({
            count: 0,
            multiplier: 1,
            description: "Ilość drifów: 0 · Mnożnik: 1",
        });
    });

    it("shows intelligence as a character attribute", () => {
        const [column] = buildStatColumns({ stats: { Inteligencja: "135" } });
        expect(column.categories[0].category.title).toBe("Atrybuty");
        expect(column.categories[0].values).toEqual([
            { key: "Inteligencja", displayName: "Inteligencja", val: 135 },
        ]);
    });
    it("formats numeric and percentage values consistently", () => {
        expect(formatStatValue(1.236)).toBe(1.24);
        expect(formatStatValue("12,345%")).toBe("12.35%");
        expect(formatStatValue("brak")).toBe("brak");
    });

    it("separates base, drif, and orb statistics using exact calculation sources", () => {
        const columns = buildStatColumns({
            stats: { Siła: 10, DAMAGE_FIRE: 4, CRITICAL_CHANCE: 8, Pojemność: 20 },
            gameRules: { bonusTranslations: { DAMAGE_FIRE: "Ogień" } },
            statSources: {
                drifCategories: { DAMAGE_FIRE: "OFFENSIVE" },
                orbBonusTypes: ["CRITICAL_CHANCE"],
            },
        });

        expect(columns.map(({ title }) => title)).toEqual([
            "Statystyki podstawowe",
            "Drify",
            "Orby",
        ]);
        expect(columns[1].categories[0].values[0].displayName).toBe("Ogień");
        expect(
            columns
                .flatMap(({ categories }) => categories)
                .flatMap(({ values }) => values)
                .some(({ key }) => key === "Pojemność")
        ).toBe(false);
    });

    it("uses the fallback category only when a stat is not reported as an orb", () => {
        const [column] = buildStatColumns({
            stats: { MANA_REGEN: 3 },
            statSources: { orbBonusTypes: ["MANA_REGEN"] },
        }).filter(({ title }) => title === "Orby");
        expect(column.categories[0].category.title).toBe("Orby użytkowe");
    });
});
