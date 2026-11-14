const sizeIndex = {
    SUBDRIF: 0,
    BIDRIF: 1,
    MAGNIDRIF: 2,
    ARCYDRIF: 3,
    SUBORB: 0,
    BIORB: 1,
    MAGNIORB: 2,
    ARCYORB: 3,
};

const resourcesInSlot = (slot = {}, builtIn = false) => [
    ...(slot.itemId
        ? [{ kind: "item", id: slot.itemId, level: slot.itemStars ?? 1, configuration: slot }]
        : []),
    ...(builtIn ? [] : slot.drifIds || []).flatMap((id, index) =>
        id ? [{ kind: "drif", id, level: slot.drifLevels?.[index] ?? 1 }] : []
    ),
    ...(slot.orbIds || []).flatMap((id, index) =>
        id ? [{ kind: "orb", id, level: slot.orbLevels?.[index] ?? 1 }] : []
    ),
];

/** Treat each physical occurrence as a consumable match; never mutate either build. */
export const findMissingResources = (current, backpack = [], target, data = {}) => {
    const templates = { item: data.items || [], drif: data.drifs || [], orb: data.orbs || [] };
    const template = (resource) =>
        templates[resource.kind].find((entry) => String(entry.id) === String(resource.id));
    const slotResources = (slot) =>
        resourcesInSlot(
            slot,
            ["EPIC", "SET"].includes(
                data.items?.find((item) => String(item.id) === String(slot?.itemId))?.rarity
            )
        );
    const pool = [
        ...Object.values(current?.slots || {}).flatMap(slotResources),
        ...backpack.flatMap((entry) =>
            entry.kind === "ITEM"
                ? slotResources(entry.equipment)
                : [{ kind: entry.kind.toLowerCase(), id: entry.templateId, level: entry.level }]
        ),
    ];
    const requirements = Object.entries(target?.slots || {}).flatMap(([slot, configuration]) =>
        slotResources(configuration).map((resource) => ({ ...resource, slot }))
    );
    // Reserve exact matches before spending a stone that another requirement needs unchanged.
    const matches = requirements.map((needed) => {
        const index = pool.findIndex(
            (owned) =>
                owned.kind === needed.kind &&
                String(owned.id) === String(needed.id) &&
                owned.level === needed.level
        );
        return index < 0 ? null : pool.splice(index, 1)[0];
    });
    const result = requirements.map((needed, position) => {
        let owned = matches[position];
        if (!owned) {
            const targetTemplate = template(needed);
            const index = pool.findIndex((candidate) => {
                if (candidate.kind !== needed.kind || candidate.level > needed.level) return false;
                if (String(candidate.id) === String(needed.id)) return true;
                const source = template(candidate);
                return (
                    needed.kind !== "item" &&
                    source?.bonusType &&
                    source.bonusType === targetTemplate?.bonusType &&
                    sizeIndex[source.size] <= sizeIndex[targetTemplate.size]
                );
            });
            if (index >= 0) owned = pool.splice(index, 1)[0];
        }
        return {
            ...needed,
            sourceConfiguration: owned?.configuration,
            name: template(needed)?.name || String(needed.id),
            status: !owned
                ? "missing"
                : String(owned.id) === String(needed.id) && owned.level === needed.level
                  ? "owned"
                  : "upgrade",
            fromId: owned?.id,
            fromLevel: owned?.level,
        };
    });
    for (const [key, slot] of Object.entries(target?.slots || {})) {
        if (slot.synergetic)
            result.push({
                kind: "synergetic",
                slot: key,
                name: slot.synergetic.name,
                status:
                    JSON.stringify(slot.synergetic) ===
                    JSON.stringify(current?.slots?.[key]?.synergetic)
                        ? "owned"
                        : "configure",
            });
        const item = data.items?.find((item) => String(item.id) === String(slot.itemId));
        if (!["EPIC", "SET"].includes(item?.rarity)) continue;
        const owned = result.find(
            (row) => row.kind === "item" && row.slot === key
        )?.sourceConfiguration;
        (slot.drifIds || []).forEach((id, index) => {
            const beforeLevel = owned?.drifLevels?.[index] ?? 1;
            const level = slot.drifLevels?.[index] ?? 1;
            if (level > beforeLevel)
                result.push({
                    kind: "built-in",
                    slot: key,
                    name: `${item.name} · ${templates.drif.find((drif) => String(drif.id) === String(id))?.name || id}`,
                    status: "upgrade",
                    fromLevel: beforeLevel,
                    level,
                });
        });
    }
    return result;
};
