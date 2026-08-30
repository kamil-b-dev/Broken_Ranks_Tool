/** Returns the capacity multiplier consumed by a drif level. */
export const getEffectiveDrifMultiplier = (level) => {
    const normalizedLevel = Number.parseInt(level) || 1;
    if (normalizedLevel <= 6) return 1;
    if (normalizedLevel <= 11) return 2;
    if (normalizedLevel <= 16) return 3;
    return 4;
};

/** Groups selectable game resources by their user-facing type. */
export const groupGearOptionsByType = (items) => {
    if (!Array.isArray(items)) return {};
    return items.reduce((groups, item) => {
        const type = item.name || item.description || item.bonusType;
        if (!type) return groups;
        if (!groups[type]) groups[type] = [];
        groups[type].push(item);
        return groups;
    }, {});
};

export const calculateMaximumDrifSlots = ({ hasItem, isEpicOrSet, tier, stars }) => {
    if (!hasItem || isEpicOrSet) return 0;
    let maximum = tier >= 10 ? 3 : tier >= 4 ? 2 : tier >= 1 ? 1 : 0;
    if ((tier === 2 || tier === 3) && stars >= 7) maximum += 1;
    return maximum;
};

export const calculateMaximumDrifSizeIndex = ({ hasItem, isEpicOrSet, tier }) => {
    if (!hasItem || isEpicOrSet) return -1;
    if (tier >= 10) return 3;
    if (tier >= 7) return 2;
    if (tier >= 4) return 1;
    return 0;
};

export const calculateItemCapacity = (item, stars) => {
    const baseCapacity = Number(item?.capacity) || 0;
    if (baseCapacity === 0) return 0;
    const starBonus = stars >= 9 ? 4 : stars >= 8 ? 2 : stars >= 7 ? 1 : 0;
    return baseCapacity + starBonus;
};

export const calculateUsedDrifPower = ({ selectedDrifs, drifs, basePowers, levels }) =>
    selectedDrifs.reduce((total, drifId, index) => {
        if (!drifId) return total;
        const drif = drifs.find((candidate) => String(candidate.id) === String(drifId));
        if (!drif) return total;
        const basePower = basePowers[drif.bonusType] || 0;
        return total + basePower * getEffectiveDrifMultiplier(levels[index]);
    }, 0);
