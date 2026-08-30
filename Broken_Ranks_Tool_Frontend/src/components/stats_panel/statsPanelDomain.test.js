import { describe, expect, it } from "vitest";
import { buildStatColumns, formatStatValue } from "./statsPanelDomain";

describe("statsPanelDomain", () => {
    it("formats numeric and percentage values consistently", () => {
        expect(formatStatValue(1.236)).toBe(1.24);
        expect(formatStatValue("12,345%")).toBe("12.35%");
        expect(formatStatValue("brak")).toBe("brak");
    });

    it("separates base, drif, and orb statistics using exact calculation sources", () => {
        const columns = buildStatColumns({
            stats: { Siła: 10, DAMAGE_FIRE: 4, CRITICAL_CHANCE: 8, Pojemność: 20 },
            gameRules: { bonusTranslations: { DAMAGE_FIRE: "Ogień" } },
            statSources: { drifCategories: { DAMAGE_FIRE: "OFFENSIVE" }, orbBonusTypes: ["CRITICAL_CHANCE"] },
        });

        expect(columns.map(({ title }) => title)).toEqual(["Statystyki podstawowe", "Drify", "Orby"]);
        expect(columns[1].categories[0].values[0].displayName).toBe("Ogień");
        expect(columns.flatMap(({ categories }) => categories).flatMap(({ values }) => values).some(({ key }) => key === "Pojemność")).toBe(false);
    });

    it("uses the fallback category only when a stat is not reported as an orb", () => {
        const [column] = buildStatColumns({ stats: { MANA_REGEN: 3 }, statSources: { orbBonusTypes: ["MANA_REGEN"] } }).filter(({ title }) => title === "Orby");
        expect(column.categories[0].category.title).toBe("Orby użytkowe");
    });
});
