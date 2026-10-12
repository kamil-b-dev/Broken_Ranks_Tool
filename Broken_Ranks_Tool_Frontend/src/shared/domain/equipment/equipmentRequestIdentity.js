const numberOrValue = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : value;
};

const stones = (ids, levels = {}) => {
    const values = ids || [];
    return {
        placed: values.flatMap((id, index) =>
            id == null || id === ""
                ? []
                : [[index, numberOrValue(id), numberOrValue(levels?.[index] ?? 1)]]
        ),
        // Invalid orphan levels must remain distinct; identity never replaces validation.
        orphanLevels: Object.entries(levels || {})
            .filter(([index]) => !values[index])
            .sort(([left], [right]) => left.localeCompare(right)),
    };
};

/** Identity of calculator input, independent of editor padding and serialized ID types. */
export const equipmentRequestIdentity = ({ slots = {}, characterStats = {} } = {}) =>
    JSON.stringify({
        slots: Object.entries(slots)
            .sort(([left], [right]) => left.localeCompare(right))
            .flatMap(([key, slot]) => {
                if (!slot) return [];
                const drifs = stones(slot.drifIds, slot.drifLevels);
                const orbs = stones(slot.orbIds, slot.orbLevels);
                if (
                    !slot.itemId &&
                    !drifs.placed.length &&
                    !orbs.placed.length &&
                    !drifs.orphanLevels.length &&
                    !orbs.orphanLevels.length
                )
                    return [];
                return [
                    [
                        key,
                        numberOrValue(slot.itemId),
                        numberOrValue(slot.itemStars ?? 1),
                        drifs,
                        orbs,
                    ],
                ];
            }),
        characterStats: Object.entries(characterStats)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([name, value]) => [name, numberOrValue(value)]),
    });
