import {
    ROMAN_TO_INT,
    calculateItemCapacity,
    calculateMaximumDrifSlots,
    getDrifMaxLevel,
    getEffectiveDrifMultiplier,
} from "../../../shared/domain/equipment/equipmentRules";

/** Find the next actual socket/capacity change, without recommending a purchase. */
export function nextItemThreshold(item, stars) {
    if (!item || ["EPIC", "SET"].includes(item.rarity?.toUpperCase())) return null;
    const current = Number(stars) || 1;
    const tier = ROMAN_TO_INT[item.tier] || Number(item.tier) || 0;
    const sockets = (value) =>
        calculateMaximumDrifSlots({ hasItem: true, isEpicOrSet: false, tier, stars: value });
    for (let target = current + 1; target <= 9; target++) {
        const capacity = calculateItemCapacity(item, target);
        if (capacity > calculateItemCapacity(item, current) || sockets(target) > sockets(current))
            return {
                stars: target,
                capacityBefore: calculateItemCapacity(item, current),
                capacity,
                socketsBefore: sockets(current),
                sockets: sockets(target),
            };
    }
    return null;
}

export function nextDrifThreshold(drif, level, basePower, usedPower, capacity) {
    if (!drif) return null;
    const current = Number(level) || 1;
    const maximum = getDrifMaxLevel(drif.size);
    const plateau = [6, 11, 16, 21].find((target) => target > current && target <= maximum);
    const powerLevel = [7, 12, 17].find((target) => target > current && target <= maximum);
    const powerBefore = basePower > 0 ? basePower * getEffectiveDrifMultiplier(current) : null;
    const powerAfter =
        powerLevel && basePower > 0 ? basePower * getEffectiveDrifMultiplier(powerLevel) : null;
    const usedAfter = powerAfter == null ? null : usedPower - powerBefore + powerAfter;
    return {
        current,
        maximum,
        plateau,
        powerLevel,
        powerBefore,
        powerAfter,
        usedAfter,
        missing: usedAfter == null ? null : Math.max(0, usedAfter - capacity),
    };
}
