import { SIZE_INDEX } from "../../utils/GearRules";
import { getDrifMaxLvl } from "../../utils/formatters";

export const OPTIMIZER_CONFIG_FORMAT = "broken-ranks-tool-optimizer-config";
export const OPTIMIZER_CONFIG_VERSION = 1;
export const DRIF_CATEGORY_ORDER = ["OFFENSIVE", "DEFENSIVE", "UTILITY"];
export const ELEMENTAL_DRIF_TYPES = ["DAMAGE_ENERGY", "DAMAGE_FIRE", "DAMAGE_FROST"];
export const DRIF_CATEGORY_LABELS = {
    OFFENSIVE: "Ofensywne",
    DEFENSIVE: "Defensywne",
    UTILITY: "Użytkowe",
};

const DRIF_BONUS_CATEGORY_FALLBACK = {
    CC_PROTECTION: "DEFENSIVE",
    CRITICAL_DAMAGE_CHANCE_REDUCTION: "DEFENSIVE",
    CRITICAL_DAMAGE_REDUCTION: "DEFENSIVE",
    DAMAGE_REDUCTION: "DEFENSIVE",
    DAMAGE_REDUCTION_CHANCE: "DEFENSIVE",
    DEFENSE_MELEE: "DEFENSIVE",
    DEFENSE_MENTAL: "DEFENSIVE",
    DEFENSE_RANGE: "DEFENSIVE",
    DODGE_CHANCE: "DEFENSIVE",
    DOUBLE_DEFENSE_ROLL_CHANCE: "DEFENSIVE",
    PASIVE_DAMAGE_REDUCTION: "DEFENSIVE",
    PERCENTAGE_DAMAGE_REDUCTION: "DEFENSIVE",
    CRITICAL_CHANCE: "OFFENSIVE",
    DAMAGE_ENERGY: "OFFENSIVE",
    DAMAGE_FIRE: "OFFENSIVE",
    DAMAGE_FROST: "OFFENSIVE",
    DAMAGE_MAGIC: "OFFENSIVE",
    DAMAGE_PHYSICAL: "OFFENSIVE",
    DOUBLE_ATTACK_CHANCE: "OFFENSIVE",
    DOUBLE_HIT_ROLL_CHANCE: "OFFENSIVE",
    HIT_CHANCE_MELEE: "OFFENSIVE",
    HIT_CHANCE_MENTAL: "OFFENSIVE",
    HIT_CHANCE_RANGED: "OFFENSIVE",
    MENTAL_DEFENSE_REDUCTION: "OFFENSIVE",
    DISPELL_CHANCE: "UTILITY",
    MANA_REGEN: "UTILITY",
    MANA_STEAL: "UTILITY",
    MANA_USAGE_REDUCTION: "UTILITY",
    STAMINA_REGEN: "UTILITY",
    STAMINA_USAGE_REDUCTION: "UTILITY",
};

export const DRIF_CATEGORY_TEXT_CLASSES = {
    OFFENSIVE: "text-red-400 group-hover:text-red-300",
    DEFENSIVE: "text-sky-400 group-hover:text-sky-300",
    UTILITY: "text-emerald-400 group-hover:text-emerald-300",
};
export const ITEM_STAR_DRIF_BONUS = { 7: 0.03, 8: 0.08, 9: 0.15 };

export const getDrifPenaltyMultiplier = (count, multipliers = {}) => {
    const providedMultiplier = Number(multipliers?.[count]);
    if (Number.isFinite(providedMultiplier)) return providedMultiplier;
    if (count <= 3) return 1;
    return (
        { 4: 0.95, 5: 0.87, 6: 0.8, 7: 0.74, 8: 0.69, 9: 0.64, 10: 0.59, 11: 0.54 }[count] ?? 0.5
    );
};

export const createBonusOption = ([key, value], drifBonusCategories = {}) => ({
    key,
    value,
    categoryKey: drifBonusCategories[key] || DRIF_BONUS_CATEGORY_FALLBACK[key] || "",
});

export const sortBonusesByCategory = (bonuses) =>
    [...bonuses].sort((left, right) => {
        const categoryIndex = (categoryKey) => {
            const index = DRIF_CATEGORY_ORDER.indexOf(categoryKey);
            return index === -1 ? Number.MAX_SAFE_INTEGER : index;
        };
        return (
            categoryIndex(left.categoryKey) - categoryIndex(right.categoryKey) ||
            left.value.localeCompare(right.value, "pl")
        );
    });

export const numericStatValue = (value) =>
    Number.parseFloat(
        String(value ?? "0")
            .replace("%", "")
            .replace(",", ".")
            .replace("+", "")
            .trim()
    );

export const parsePercentage = (value) => {
    const parsed = Number.parseFloat(
        String(value ?? "0")
            .replace("%", "")
            .replace(",", ".")
            .trim()
    );
    return Number.isFinite(parsed) ? parsed : 0;
};

export const calculateDrifValue = (drif, level) => {
    const baseValue = parsePercentage(drif?.baseValue);
    const increment = parsePercentage(drif?.increment);
    let value = baseValue;
    for (let currentLevel = 2; currentLevel <= level; currentLevel += 1) {
        value += currentLevel >= 19 ? increment * 2 : increment;
    }
    return value;
};

export const maxDrifSizeIndexForTier = (tier) => {
    if (tier >= 10) return SIZE_INDEX.ARCYDRIF;
    if (tier >= 7) return SIZE_INDEX.MAGNIDRIF;
    if (tier >= 4) return SIZE_INDEX.BIDRIF;
    return SIZE_INDEX.SUBDRIF;
};

export const highestLevelForCapacity = (drif, capacity, basePower) => {
    const affordableMultiplier = Math.max(
        1,
        Math.min(4, Math.floor(capacity / Math.max(1, basePower)))
    );
    const sizeMaxLevel = getDrifMaxLvl(drif?.size);
    if (affordableMultiplier === 1) return Math.min(6, sizeMaxLevel);
    if (affordableMultiplier === 2) return Math.min(11, sizeMaxLevel);
    if (affordableMultiplier === 3) return Math.min(16, sizeMaxLevel);
    return sizeMaxLevel;
};

export const formatPotentialValue = (value) =>
    `${Number(value).toLocaleString("pl-PL", { maximumFractionDigits: 2 })}%`;
