import { ROMAN_ORDER, SIZE_ORDER } from "../../utils/GearRules";

export const deduplicateVariants = (variants) => {
    const seen = new Set();
    return variants.filter((variant) => {
        const key = variant.size || variant.tier;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

export const sortVariants = (variants) =>
    [...variants].sort((left, right) => {
        const leftValue = left.size || left.tier || "";
        const rightValue = right.size || right.tier || "";
        const leftOrder =
            SIZE_ORDER[leftValue.toUpperCase()] || ROMAN_ORDER[leftValue.toUpperCase()] || 99;
        const rightOrder =
            SIZE_ORDER[rightValue.toUpperCase()] || ROMAN_ORDER[rightValue.toUpperCase()] || 99;
        return leftOrder - rightOrder;
    });

export const buildItemDatabaseGroups = ({ activeTab, items, orbs, drifs, categoryNames }) => {
    const groups = {};
    const tiers = new Set();
    const stats = new Set();

    if (activeTab === "items") {
        items.forEach((item) => {
            const category = categoryNames[item.category] || item.category || "INNE";
            if (!groups[category]) groups[category] = [];
            groups[category].push(item);
            if (item.tier) tiers.add(item.tier);
            Object.keys(item.stats || {}).forEach((stat) => stats.add(stat));
        });
    } else {
        const source = activeTab === "orbs" ? orbs : drifs;
        const byType = {};
        source.forEach((entry) => {
            if (!byType[entry.bonusType]) byType[entry.bonusType] = [];
            byType[entry.bonusType].push(entry);
        });
        groups[activeTab === "orbs" ? "Orby" : "Drify"] = Object.values(byType).map((variants) =>
            sortVariants(deduplicateVariants(variants))
        );
    }

    return {
        groupedData: groups,
        allCategories: ["Wszystkie", ...Object.keys(groups).sort()],
        allTiers: [
            "Wszystkie",
            ...Array.from(tiers).sort(
                (left, right) => (ROMAN_ORDER[left] || 99) - (ROMAN_ORDER[right] || 99)
            ),
        ],
        allStats: ["Wszystkie", ...Array.from(stats).sort()],
    };
};

export const filterItemDatabaseGroups = ({
    groupedData,
    activeTab,
    filters,
    bonusTranslations,
    drifBasePowers,
}) =>
    Object.entries(groupedData).reduce((filtered, [category, entries]) => {
        if (
            activeTab === "items" &&
            filters.category !== "Wszystkie" &&
            category !== filters.category
        ) {
            return filtered;
        }
        const search = filters.search.toLowerCase();
        const matches = entries.filter((entry) => {
            if (activeTab === "items") {
                return (
                    (entry.name || "").toLowerCase().includes(search) &&
                    (filters.tier === "Wszystkie" || entry.tier === filters.tier) &&
                    (filters.stat === "Wszystkie" || entry.stats?.[filters.stat] !== undefined)
                );
            }
            const base = entry[0];
            if (!base) return false;
            const translated = bonusTranslations[base.bonusType] || base.bonusType || "";
            const matchesSearch =
                (base.name || "").toLowerCase().includes(search) ||
                translated.toLowerCase().includes(search);
            if (activeTab === "orbs") {
                return (
                    matchesSearch &&
                    (filters.orbCategory === "Wszystkie" || base.category === filters.orbCategory)
                );
            }
            const matchesPower =
                !filters.basePower || String(drifBasePowers[base.bonusType]) === filters.basePower;
            return (
                matchesSearch &&
                (filters.drifCategory === "Wszystkie" || base.category === filters.drifCategory) &&
                matchesPower
            );
        });
        if (matches.length > 0) filtered[category] = matches;
        return filtered;
    }, {});
