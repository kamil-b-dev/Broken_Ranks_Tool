/** Compares equipment independently of editor padding and serialized ID types. */
export const advisorBuildSignature = (slots) =>
    JSON.stringify(
        Object.entries(slots || {})
            .filter(([, slot]) => slot?.itemId)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, slot]) => [
                key,
                Number(slot.itemId),
                Number(slot.itemStars || 0),
                ["drif", "orb"].map((kind) =>
                    (slot[`${kind}Ids`] || []).flatMap((id, index) =>
                        id ? [[index, Number(id), Number(slot[`${kind}Levels`]?.[index] || 1)]] : []
                    )
                ),
            ])
    );
