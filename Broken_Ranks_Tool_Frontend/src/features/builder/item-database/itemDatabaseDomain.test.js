import { describe, expect, it } from "vitest";
import {
    buildItemDatabaseGroups,
    createItemDatabaseSearch,
    filterItemDatabaseGroups,
} from "./itemDatabaseDomain";

describe("itemDatabaseDomain", () => {
    const items = [
        { id: 1, name: "Miłość Morany", boss: "Morana", tier: "X", stats: { Siła: 5 } },
        { id: 2, name: "Hełm Nocy", boss: "Tarul", tier: "XI", stats: { Moc: 3 } },
        { id: 3, name: "Amulet (testowy)", boss: null, tier: "I", stats: {} },
        { id: 4, name: "Zwykły hełm", tier: "X", stats: {} },
    ];
    const matches = (query) =>
        items.filter(createItemDatabaseSearch(query).matches).map((item) => item.id);
    it.each([
        ["morana", [1]],
        ["  MORANA  ", [1]],
        ["^MORANA$", [1]],
        ["^(Morana|Tarul)$", [1, 2]],
        ["Miłość.*Morany", [1]],
        ["^T[ae]rul$", [2]],
        ["Hełm.*Tarul", []],
        ["", [1, 2, 3, 4]],
        ["(", [3]],
    ])("matches item names or bosses using query %s", (query, expected) => {
        expect(matches(query)).toEqual(expected);
    });
    it("reports malformed expressions, retains literal search and does not alternate repeated matches", () => {
        expect(createItemDatabaseSearch("(").error).toContain("Niepoprawne wyrażenie regularne");
        const valid = createItemDatabaseSearch("Morana|Tarul");
        expect(valid.error).toBeNull();
        expect([items[0], items[0], items[0]].every(valid.matches)).toBe(true);
    });
    it("combines boss expressions with the existing category, tier and stat filters", () => {
        const result = filterItemDatabaseGroups({
            groupedData: { Hełmy: items, Zbroje: [{ ...items[0], id: 5 }] },
            activeTab: "items",
            filters: { search: "Morana|Tarul", category: "Hełmy", tier: "X", stat: "Siła" },
        });
        expect(result).toEqual({ Hełmy: [items[0]] });
    });
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
