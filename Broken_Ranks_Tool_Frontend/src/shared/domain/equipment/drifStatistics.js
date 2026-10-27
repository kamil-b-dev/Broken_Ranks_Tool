/** Global repetition penalty shared by statistic summaries and optimizer previews. */
export const getDrifPenaltyMultiplier = (count, multipliers = {}) => {
    const providedMultiplier = Number(multipliers?.[count]);
    if (Number.isFinite(providedMultiplier)) return providedMultiplier;
    if (count <= 3) return 1;
    return (
        { 4: 0.95, 5: 0.87, 6: 0.8, 7: 0.74, 8: 0.69, 9: 0.64, 10: 0.59, 11: 0.54 }[count] ?? 0.5
    );
};

/** Counts equipped ordinary and built-in drifs by bonus, excluding backpack resources. */
export const calculatePlacedDrifCounts = (slots, drifs) => {
    const counts = {};
    const drifsById = new Map(drifs.map((drif) => [String(drif.id), drif]));
    Object.values(slots || {}).forEach((slot) => {
        const typesInSlot = new Set();
        (slot?.drifIds || []).forEach((drifId) => {
            const drif = drifsById.get(String(drifId));
            if (drif?.bonusType && !typesInSlot.has(drif.bonusType)) {
                typesInSlot.add(drif.bonusType);
                counts[drif.bonusType] = (counts[drif.bonusType] || 0) + 1;
            }
        });
    });
    return counts;
};
