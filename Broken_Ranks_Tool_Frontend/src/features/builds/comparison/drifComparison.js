import {
    DRIF_CATEGORY_LABELS,
    DRIF_CATEGORY_ORDER,
    DRIF_SIZE_ORDER,
    normalizeDrifCategoryKey,
    resolveDrifCategoryKey,
} from "../../../shared/domain/equipment/drifCategories";
import { getBuildSlots } from "./buildComparisonData";
import { toFiniteNumber } from "./comparisonValues";

const drifSort = (left, right) =>
    DRIF_CATEGORY_ORDER.indexOf(left.category) - DRIF_CATEGORY_ORDER.indexOf(right.category) ||
    DRIF_SIZE_ORDER.indexOf(left.size) - DRIF_SIZE_ORDER.indexOf(right.size) ||
    left.name.localeCompare(right.name, "pl");

const readBuildDrifs = (build, drifById, gameRules) => {
    const entriesById = new Map();
    Object.values(getBuildSlots(build)).forEach((slot) => {
        (slot?.drifIds || []).forEach((id, index) => {
            if (id == null) return;
            const template = drifById.get(String(id));
            const bonusType = template?.bonusType || "";
            const category =
                normalizeDrifCategoryKey(template?.category) ||
                normalizeDrifCategoryKey(
                    resolveDrifCategoryKey(bonusType, gameRules.drifBonusCategories)
                );
            const size = String(template?.size || "").toUpperCase();
            const level = toFiniteNumber(slot?.drifLevels?.[index]);
            const key = String(id);
            const existing = entriesById.get(key) || {
                id: key,
                name:
                    template?.name ||
                    template?.description ||
                    gameRules.bonusTranslations?.[bonusType] ||
                    `Drif #${key}`,
                bonusLabel: gameRules.bonusTranslations?.[bonusType] || bonusType,
                category,
                size,
                count: 0,
                levels: [],
            };
            existing.count += 1;
            if (level != null) existing.levels.push(level);
            entriesById.set(key, existing);
        });
    });
    return entriesById;
};

const summarizeDrifEntries = (entriesById) => {
    const entries = [...entriesById.values()];
    const allLevels = entries.flatMap((entry) => entry.levels);
    return {
        total: entries.reduce((sum, entry) => sum + entry.count, 0),
        averageLevel: allLevels.length
            ? allLevels.reduce((sum, level) => sum + level, 0) / allLevels.length
            : null,
        categories: Object.fromEntries(
            DRIF_CATEGORY_ORDER.map((category) => {
                const categoryEntries = entries.filter((entry) => entry.category === category);
                const levels = categoryEntries.flatMap((entry) => entry.levels);
                return [
                    category,
                    {
                        label: DRIF_CATEGORY_LABELS[category],
                        count: categoryEntries.reduce((sum, entry) => sum + entry.count, 0),
                        averageLevel: levels.length
                            ? levels.reduce((sum, level) => sum + level, 0) / levels.length
                            : null,
                        sizes: Object.fromEntries(
                            DRIF_SIZE_ORDER.map((size) => [
                                size,
                                categoryEntries
                                    .filter((entry) => entry.size === size)
                                    .reduce((sum, entry) => sum + entry.count, 0),
                            ])
                        ),
                    },
                ];
            })
        ),
    };
};

/** Compares the concrete drif templates, sizes, categories, counts, and levels in builds. */
export const createDrifComposition = (builds, drifs = [], gameRules = {}) => {
    const drifById = new Map(drifs.map((drif) => [String(drif.id), drif]));
    const entriesByBuild = builds.map((build) => readBuildDrifs(build, drifById, gameRules));
    const allIds = new Set(entriesByBuild.flatMap((entries) => [...entries.keys()]));
    const common = [];

    allIds.forEach((id) => {
        const matches = entriesByBuild.map((entries) => entries.get(id)).filter(Boolean);
        if (matches.length !== builds.length) return;
        const sharedCount = Math.min(...matches.map((entry) => entry.count));
        const levels = matches.flatMap((entry) => entry.levels.slice(0, sharedCount));
        common.push({
            ...matches[0],
            count: sharedCount,
            minimumLevel: levels.length ? Math.min(...levels) : null,
            maximumLevel: levels.length ? Math.max(...levels) : null,
        });
    });
    common.sort(drifSort);
    const commonCountById = new Map(common.map((entry) => [entry.id, entry.count]));

    return {
        builds: builds.map((build, index) => ({
            id: build.id,
            name: build.name,
            ...summarizeDrifEntries(entriesByBuild[index]),
        })),
        common,
        outsideCommon: builds.map((build, index) => ({
            id: build.id,
            name: build.name,
            entries: [...entriesByBuild[index].values()]
                .flatMap((entry) => {
                    const sharedCount = commonCountById.get(entry.id) || 0;
                    const count = entry.count - sharedCount;
                    return count > 0
                        ? [{ ...entry, count, levels: entry.levels.slice(sharedCount) }]
                        : [];
                })
                .sort(drifSort),
        })),
    };
};
