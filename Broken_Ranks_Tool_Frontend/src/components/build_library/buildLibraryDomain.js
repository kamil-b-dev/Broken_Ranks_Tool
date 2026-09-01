import { SLOTS } from "../../constants/equipment";
import {
    DRIF_CATEGORY_LABELS,
    DRIF_CATEGORY_ORDER,
    resolveDrifCategoryKey,
} from "../optimization/optimizerDomain";

export const DRIF_SIZE_ORDER = ["SUBDRIF", "BIDRIF", "MAGNIDRIF", "ARCYDRIF"];
export const DRIF_SIZE_LABELS = {
    SUBDRIF: "S",
    BIDRIF: "B",
    MAGNIDRIF: "M",
    ARCYDRIF: "A",
};

const getSlots = (record) => record?.payload?.build?.requestData?.slots || {};
const populatedIds = (ids) => (Array.isArray(ids) ? ids.filter((id) => id != null) : []);

export const summarizeLocalBuild = (record) => {
    const slots = Object.values(getSlots(record));
    return {
        equipped: slots.filter((slot) => slot?.itemId != null).length,
        drifs: slots.reduce((sum, slot) => sum + populatedIds(slot?.drifIds).length, 0),
        orbs: slots.reduce((sum, slot) => sum + populatedIds(slot?.orbIds).length, 0),
        level: Number(record?.payload?.build?.characterConfig?.level) || 1,
        hasStats: Boolean(record?.stats && Object.keys(record.stats).length),
    };
};

export const createEquipmentComparisonRows = (builds, items = []) => {
    const itemById = new Map(items.map((item) => [String(item.id), item]));
    return SLOTS.map((slot) => {
        const values = builds.map((build) => {
            const slotData = getSlots(build)[slot.key];
            const item =
                slotData?.itemId != null ? itemById.get(String(slotData.itemId)) : undefined;
            const drifCount = populatedIds(slotData?.drifIds).length;
            const orbCount = populatedIds(slotData?.orbIds).length;
            return {
                itemName: item?.name || "Pusty slot",
                tier: item?.tier || null,
                stars: Number(slotData?.itemStars) || 0,
                drifCount,
                orbCount,
                signature: JSON.stringify({
                    itemId: slotData?.itemId ?? null,
                    itemStars: Number(slotData?.itemStars) || 0,
                    orbIds: populatedIds(slotData?.orbIds),
                    orbLevels: slotData?.orbLevels || [],
                    drifIds: populatedIds(slotData?.drifIds),
                    drifLevels: slotData?.drifLevels || {},
                }),
            };
        });
        return {
            key: slot.key,
            label: slot.label,
            values,
            differs: new Set(values.map((value) => value.signature)).size > 1,
        };
    });
};

const numericValue = (value) => {
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    const parsed = Number.parseFloat(
        String(value ?? "")
            .replace("%", "")
            .replace(",", ".")
    );
    return Number.isFinite(parsed) ? parsed : null;
};

const createComparisonRow = (key, builds, bonusTranslations) => {
    const values = builds.map((build) => build.stats?.[key] ?? null);
    const numericValues = values.map(numericValue);
    const finiteValues = numericValues.filter((value) => value != null);
    const highest = finiteValues.length ? Math.max(...finiteValues) : null;
    return {
        key,
        label: bonusTranslations[key] || key,
        values,
        highestIndexes:
            highest == null
                ? []
                : numericValues.flatMap((value, index) => (value === highest ? [index] : [])),
        differs: new Set(values.map((value) => String(value ?? ""))).size > 1,
    };
};

export const formatComparisonValue = (value) => {
    if (value == null || value === "") return "—";
    if (typeof value === "number")
        return value.toLocaleString("pl-PL", { maximumFractionDigits: 2 });
    return String(value);
};

export const createStatComparisonRows = (builds, bonusTranslations = {}) => {
    const keys = new Set(builds.flatMap((build) => Object.keys(build.stats || {})));
    return [...keys]
        .map((key) => createComparisonRow(key, builds, bonusTranslations))
        .sort((left, right) => left.label.localeCompare(right.label, "pl"));
};

const normalizeCategory = (value) => {
    const category = String(value || "")
        .trim()
        .toUpperCase();
    return DRIF_CATEGORY_ORDER.includes(category) ? category : "";
};

const resolveStatGroup = (key, builds, gameRules) => {
    const reportedDrifCategory = builds
        .map((build) => normalizeCategory(build.statSources?.drifCategories?.[key]))
        .find(Boolean);
    if (reportedDrifCategory) return reportedDrifCategory;

    const isReportedOrb = builds.some((build) =>
        (build.statSources?.orbBonusTypes || []).includes(key)
    );
    if (isReportedOrb) return "ORBS";

    return resolveDrifCategoryKey(key, gameRules.drifBonusCategories) || "CHARACTER";
};

/** Separates calculated values into character, orb, and drif comparison groups. */
export const createStatComparisonGroups = (builds, gameRules = {}) => {
    const bonusTranslations = gameRules.bonusTranslations || {};
    const groups = {
        character: [],
        orbs: [],
        drifs: Object.fromEntries(DRIF_CATEGORY_ORDER.map((category) => [category, []])),
    };
    const keys = new Set(builds.flatMap((build) => Object.keys(build.stats || {})));

    [...keys].forEach((key) => {
        if (/bonus drify|pojemność/i.test(key)) return;
        const row = createComparisonRow(key, builds, bonusTranslations);
        const group = resolveStatGroup(key, builds, gameRules);
        if (group === "ORBS") groups.orbs.push(row);
        else if (DRIF_CATEGORY_ORDER.includes(group)) groups.drifs[group].push(row);
        else groups.character.push(row);
    });

    const sortRows = (rows) =>
        rows.sort((left, right) => left.label.localeCompare(right.label, "pl"));
    sortRows(groups.character);
    sortRows(groups.orbs);
    DRIF_CATEGORY_ORDER.forEach((category) => sortRows(groups.drifs[category]));
    return groups;
};

const drifSort = (left, right) =>
    DRIF_CATEGORY_ORDER.indexOf(left.category) - DRIF_CATEGORY_ORDER.indexOf(right.category) ||
    DRIF_SIZE_ORDER.indexOf(left.size) - DRIF_SIZE_ORDER.indexOf(right.size) ||
    left.name.localeCompare(right.name, "pl");

const readBuildDrifs = (build, drifById, gameRules) => {
    const entriesById = new Map();
    Object.values(getSlots(build)).forEach((slot) => {
        (slot?.drifIds || []).forEach((id, index) => {
            if (id == null) return;
            const template = drifById.get(String(id));
            const bonusType = template?.bonusType || "";
            const category =
                normalizeCategory(template?.category) ||
                normalizeCategory(resolveDrifCategoryKey(bonusType, gameRules.drifBonusCategories));
            const size = String(template?.size || "").toUpperCase();
            const level = numericValue(slot?.drifLevels?.[index]);
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
