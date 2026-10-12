/** Canonicalizes only trailing empty orb positions; occupied positions and bad levels stay visible. */
export const normalizeTrailingOrbSlots = (slot) => {
    if (!slot || !Array.isArray(slot.orbIds) || slot.orbIds.length > 2) return slot;
    const originalCount = slot.orbIds.length;
    let count = originalCount;
    while (count > 0 && (slot.orbIds[count - 1] == null || slot.orbIds[count - 1] === "")) count--;
    if (count === originalCount) return slot;
    const normalized = { ...slot, orbIds: slot.orbIds.slice(0, count) };
    if (Array.isArray(slot.orbLevels)) {
        const levels = [...slot.orbLevels];
        while (levels.length > count && levels.length <= originalCount && levels.at(-1) == null)
            levels.pop();
        normalized.orbLevels = levels;
    } else if (slot.orbLevels && typeof slot.orbLevels === "object") {
        normalized.orbLevels = Object.fromEntries(
            Object.entries(slot.orbLevels).filter(([key, level]) => {
                const index = Number(key);
                return !(
                    Number.isInteger(index) &&
                    String(index) === key &&
                    index >= count &&
                    index < originalCount &&
                    level == null
                );
            })
        );
    }
    return normalized;
};
