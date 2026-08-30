import { describe, expect, it } from "vitest";
import { buildItemDatabaseGroups, filterItemDatabaseGroups } from "./itemDatabaseDomain";

describe("itemDatabaseDomain", () => {
    it("groups item metadata and exposes ordered filter values", () => {
        const result = buildItemDatabaseGroups({
            activeTab: "items",
            items: [
                { id: 1, category: "HELMET", tier: "IV", stats: { Moc: 2 } },
                { id: 2, category: "HELMET", tier: "II", stats: { Wiedza: 3 } },
            ],
            orbs: [],
            drifs: [],
            categoryNames: { HELMET: "Hełmy" },
        });

        expect(result.groupedData.Hełmy).toHaveLength(2);
        expect(result.allTiers).toEqual(["Wszystkie", "II", "IV"]);
        expect(result.allStats).toEqual(["Wszystkie", "Moc", "Wiedza"]);
    });

    it("deduplicates and orders drif variants by size", () => {
        const result = buildItemDatabaseGroups({
            activeTab: "drifs",
            items: [],
            orbs: [],
            drifs: [
                { id: 3, bonusType: "CRITICAL", size: "BIDRIF" },
                { id: 1, bonusType: "CRITICAL", size: "SUBDRIF" },
                { id: 2, bonusType: "CRITICAL", size: "SUBDRIF" },
            ],
            categoryNames: {},
        });

        expect(result.groupedData.Drify[0].map((drif) => drif.id)).toEqual([1, 3]);
    });

    it("filters translated drifs by search, category, and base power", () => {
        const groupedData = {
            Drify: [[{ id: 1, bonusType: "CRITICAL", category: "OFFENSIVE" }]],
        };
        const result = filterItemDatabaseGroups({
            groupedData,
            activeTab: "drifs",
            filters: {
                search: "krytyk",
                category: "Wszystkie",
                orbCategory: "Wszystkie",
                drifCategory: "OFFENSIVE",
                basePower: "5",
                tier: "Wszystkie",
                stat: "Wszystkie",
            },
            bonusTranslations: { CRITICAL: "Szansa na krytyk" },
            drifBasePowers: { CRITICAL: 5 },
        });

        expect(result.Drify).toHaveLength(1);
    });
});
