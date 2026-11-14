/** Compares equipment independently of editor padding and serialized ID types. */
export const advisorBuildSignature = (slots) =>
    JSON.stringify(
        Object.entries(slots || {})
            .filter(([, slot]) => slot?.itemId || slot?.synergetic)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, slot]) => [
                key,
                Number(slot.itemId),
                Number(slot.itemStars ?? 1),
                ["drif", "orb"].map((kind) =>
                    (slot[`${kind}Ids`] || []).flatMap((id, index) =>
                        id ? [[index, Number(id), Number(slot[`${kind}Levels`]?.[index] || 1)]] : []
                    )
                ),
                ...(slot.synergetic
                    ? [
                          [
                              slot.synergetic.name,
                              Object.entries(slot.synergetic.stats).sort(([left], [right]) =>
                                  left.localeCompare(right)
                              ),
                          ],
                      ]
                    : []),
            ])
    );
