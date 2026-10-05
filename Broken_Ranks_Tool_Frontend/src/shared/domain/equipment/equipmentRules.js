export const ROMAN_TO_INT = {
    I: 1,
    II: 2,
    III: 3,
    IV: 4,
    V: 5,
    VI: 6,
    VII: 7,
    VIII: 8,
    IX: 9,
    X: 10,
    XI: 11,
    XII: 12,
};

export const ROMAN_ORDER = ROMAN_TO_INT;

/** Pure equipment rules shared by import validation, the editor and optimizer previews. */
export const getMaximumStoneSizeIndex = (tier) =>
    tier >= 10 ? 3 : tier >= 7 ? 2 : tier >= 4 ? 1 : 0;

export const getEffectiveDrifMultiplier = (level) => {
    const normalized = Number.parseInt(level) || 1;
    return normalized <= 6 ? 1 : normalized <= 11 ? 2 : normalized <= 16 ? 3 : 4;
};

export const calculateMaximumDrifSlots = ({ hasItem, isEpicOrSet, tier, stars }) => {
    if (!hasItem || isEpicOrSet) return 0;
    const base = tier >= 10 ? 3 : tier >= 4 ? 2 : tier >= 1 ? 1 : 0;
    return base + ((tier === 2 || tier === 3) && stars >= 7 ? 1 : 0);
};

export const calculateMaximumDrifSizeIndex = ({ hasItem, isEpicOrSet, tier }) =>
    !hasItem || isEpicOrSet ? -1 : getMaximumStoneSizeIndex(tier);

export const calculateMaximumOrbSizeIndex = ({ hasItem, tier }) =>
    hasItem ? getMaximumStoneSizeIndex(tier) : -1;

export const calculateItemCapacity = (item, stars) => {
    const base = Number(item?.capacity) || 0;
    return base === 0 ? 0 : base + (stars >= 9 ? 4 : stars >= 8 ? 2 : stars >= 7 ? 1 : 0);
};

export const SIZE_INDEX = {
    SUBDRIF: 0,
    BIDRIF: 1,
    MAGNIDRIF: 2,
    ARCYDRIF: 3,
};

export const SIZE_ORDER = {
    SUBDRIF: 1,
    BIDRIF: 2,
    MAGNIDRIF: 3,
    ARCYDRIF: 4,
};

export const DRIF_MULTIPLIERS = {
    SUBDRIF: 1,
    BIDRIF: 2,
    MAGNIDRIF: 3,
    ARCYDRIF: 4,
};

/** Returns the maximum allowed level for a drif size. */
export const getDrifMaxLevel = (size) => {
    if (!size) return 21;
    return (
        {
            SUBDRIF: 6,
            BIDRIF: 11,
            MAGNIDRIF: 16,
            ARCYDRIF: 21,
        }[size.toUpperCase()] ?? 21
    );
};

/** Returns the maximum allowed level for an orb size. */
export const getOrbMaxLevel = (size) => (String(size).toUpperCase() === "SUBORB" ? 1 : 3);
