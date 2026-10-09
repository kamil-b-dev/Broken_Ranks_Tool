import {
    DRIF_CATEGORY_ORDER,
    normalizeDrifCategoryKey,
    resolveDrifCategoryKey,
} from "../../../shared/domain/equipment/drifCategories";
import { toFiniteNumber } from "./comparisonValues";

const usefulValue = (key, value, gameRules) => {
    if (value == null) return null;
    const cap = gameRules.drifMaxCaps?.[key];
    const negativeDirection =
        key === "MANA_USAGE_REDUCTION" || key === "STAMINA_USAGE_REDUCTION" || cap < 0;
    const effect = negativeDirection ? -value : value;
    return cap != null && Number.isFinite(Number(cap))
        ? Math.min(effect, Math.abs(Number(cap)))
        : effect;
};

const createComparisonRow = (key, builds, gameRules) => {
    const values = builds.map((build) => build.stats?.[key] ?? null);
    const numericValues = values.map((value) => usefulValue(key, toFiniteNumber(value), gameRules));
    const finiteValues = numericValues.filter((value) => value != null);
    const highest = finiteValues.length ? Math.max(...finiteValues) : null;
    return {
        key,
        label: gameRules.bonusTranslations?.[key] || key,
        values,
        highestIndexes:
            highest == null
                ? []
                : numericValues.flatMap((value, index) => (value === highest ? [index] : [])),
        differs: new Set(values.map((value) => String(value ?? ""))).size > 1,
    };
};

const resolveStatGroup = (key, builds, gameRules) => {
    const reportedDrifCategory = builds
        .map((build) => normalizeDrifCategoryKey(build.statSources?.drifCategories?.[key]))
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
    const groups = {
        character: [],
        orbs: [],
        drifs: Object.fromEntries(DRIF_CATEGORY_ORDER.map((category) => [category, []])),
    };
    const keys = new Set(builds.flatMap((build) => Object.keys(build.stats || {})));

    [...keys].forEach((key) => {
        if (/bonus drify|pojemność/i.test(key)) return;
        const row = createComparisonRow(key, builds, gameRules);
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
