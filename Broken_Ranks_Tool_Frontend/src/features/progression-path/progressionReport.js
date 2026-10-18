export const SLOT_NAMES = {
    helmet: "Hełm",
    armor: "Zbroja",
    cape: "Peleryna",
    legs: "Spodnie",
    boots: "Buty",
    gloves: "Rękawice",
    belt: "Pas",
    necklace: "Naszyjnik",
    ring1: "Pierścień 1",
    ring2: "Pierścień 2",
    weapon: "Broń",
    shield: "Druga ręka",
};
export const findTemplate = (id, catalog = []) =>
    catalog.find((entry) => String(entry.id) === String(id));
export const templateName = (id, catalog) => findTemplate(id, catalog)?.name ?? `Kamień ${id}`;
const SIZE_NAMES = {
    SUBDRIF: "subdrif",
    BIDRIF: "bidrif",
    MAGNIDRIF: "magnidrif",
    ARCYDRIF: "arcydrif",
    SUBORB: "suborb",
    BIORB: "biorb",
    MAGNIORB: "magniorb",
    ARCYORB: "arcyorb",
};
const identity = (value) => value;
export const stoneDescription = (kind, id, level, data, t = identity) => {
    const template = findTemplate(id, kind === "drif" ? data.drifs : data.orbs);
    return `${template?.name ?? t("Kamień")} (${[t(SIZE_NAMES[template?.size]), `${t("poz.")} ${level}`].filter(Boolean).join(", ")})`;
};
export const itemName = (slot, data, t = identity) => {
    if (slot?.itemId == null) return t("Brak przedmiotu");
    const item = findTemplate(slot.itemId, data.items);
    const rarity =
        item?.rarity === "EPIC"
            ? ` · ${t("epik")}`
            : item?.rarity === "LEGENDARY"
              ? ` · ${t("legenda")}`
              : "";
    return `${item?.name ?? slot.itemId}${rarity}`;
};
const stars = (slot) => slot?.itemStars ?? 1;
const sameId = (a, b) => String(a ?? "") === String(b ?? "");
const samePosition = (a, b) => a?.slot === b?.slot && a?.socketIndex === b?.socketIndex;
const frameChanged = (a, b) => !sameId(a?.itemId, b?.itemId) || stars(a) !== stars(b);
const configured = (slot) =>
    JSON.stringify([
        String(slot?.itemId ?? ""),
        stars(slot),
        (slot?.drifIds ?? []).flatMap((id, index) =>
            id == null ? [] : [[index, String(id), slot.drifLevels?.[index] ?? 1]]
        ),
        (slot?.orbIds ?? []).flatMap((id, index) =>
            id == null ? [] : [[index, String(id), slot.orbLevels?.[index] ?? 1]]
        ),
    ]);
const isLegendUpgrade = (a, b, data) => {
    const before = findTemplate(a?.itemId, data.items);
    const after = findTemplate(b?.itemId, data.items);
    return before?.rarity === "EPIC" && after?.rarity === "LEGENDARY" && before.name === after.name;
};

export const itemUpgradeDescription = (path, data, t = identity) => {
    if (
        path.states.some(
            (slot, index) => index > 0 && isLegendUpgrade(path.states[index - 1], slot, data)
        )
    )
        return path.states
            .filter((slot) => slot?.itemId != null)
            .map((slot) => `${itemName(slot, data, t)} ${stars(slot)}★`)
            .join(" → ");
    return path.states
        .flatMap((slot, index) => {
            if (index === 0 || slot?.itemId == null || stars(slot) <= 1) return [];
            const before = path.states[index - 1];
            const start = sameId(before?.itemId, slot.itemId) ? stars(before) : 1;
            return start === stars(slot)
                ? []
                : [`${itemName(slot, data, t)} ${start}★ → ${stars(slot)}★`];
        })
        .join("; ");
};
const resourceKey = (action) => `${action.kind}:${action.instanceId}`;
const countSupplies = (entries, keyFor) => {
    const groups = new Map();
    for (const entry of entries) {
        const key = keyFor(entry);
        const group = groups.get(key);
        if (group) group.count++;
        else groups.set(key, { ...entry, count: 1 });
    }
    return [...groups.values()];
};

/** Presentation only: keep every original snapshot and operation in chronological order. */
export const createProgressionView = (report, data, t = identity) => {
    const groups = [];
    let previous = { slots: {} };
    for (const result of report.stages) {
        const level = result.stage.characterLevel;
        if (groups.at(-1)?.level !== level) groups.push({ level, steps: [], before: previous });
        const group = groups.at(-1);
        group.steps.push({ result, before: previous });
        previous = result.stage.equipment;
        group.final = result;
    }
    for (const [index, group] of groups.entries()) {
        group.isFinal = index === groups.length - 1;
        group.paths = [];
        const paths = new Map();
        const upgradedItems = new Set();
        const purchases = [];
        const resources = [];
        const builtIns = new Map();
        for (const { result, before } of group.steps) {
            const after = result.stage.equipment;
            for (const [key, slot] of Object.entries(after.slots)) {
                const old = before.slots[key];
                const item = findTemplate(slot.itemId, data.items);
                if (["EPIC", "SET"].includes(item?.rarity)) {
                    (slot.drifIds ?? []).forEach((id, socketIndex) => {
                        if (id == null) return;
                        const level = slot.drifLevels?.[socketIndex] ?? 1;
                        const oldLevel = sameId(old?.itemId, slot.itemId)
                            ? (old?.drifLevels?.[socketIndex] ?? 1)
                            : 1;
                        if (level <= oldLevel) return;
                        const resourceId = `${key}:${socketIndex}`;
                        builtIns.set(resourceId, {
                            key: resourceId,
                            slot: key,
                            itemId: slot.itemId,
                            templateId: id,
                            beforeLevel: builtIns.get(resourceId)?.beforeLevel ?? oldLevel,
                            level,
                        });
                    });
                }
                if (!frameChanged(old, slot)) continue;
                if (!paths.has(key)) paths.set(key, { slot: key, states: [old ?? null] });
                paths.get(key).states.push(slot);
                const legend = isLegendUpgrade(old, slot, data);
                if (slot.itemId != null && !sameId(old?.itemId, slot.itemId) && !legend)
                    purchases.push({ itemId: slot.itemId });
                if (
                    legend ||
                    (slot.itemId != null &&
                        stars(slot) > 1 &&
                        (!sameId(old?.itemId, slot.itemId) || stars(old) !== stars(slot)))
                )
                    upgradedItems.add(key);
            }
            resources.push(
                ...result.actions.map((action) => ({ ...action, kind: "drif" })),
                ...(result.orbActions ?? []).map((action) => ({ ...action, kind: "orb" }))
            );
        }
        group.paths = [...paths.values()];
        group.purchases = countSupplies(purchases, (entry) => String(entry.itemId));
        const acquired = resources.filter((action) => action.type === "ACQUIRE");
        const acquiredKeys = new Set(acquired.map(resourceKey));
        group.supplies = countSupplies(
            acquired,
            (entry) => `${entry.kind}:${entry.templateId}:${entry.level}`
        );
        const upgrades = new Map();
        const moves = new Map();
        for (const action of resources) {
            const key = resourceKey(action);
            if (action.type === "UPGRADE") {
                const old = upgrades.get(key);
                upgrades.set(
                    key,
                    old
                        ? {
                              ...action,
                              beforeTemplateId: old.beforeTemplateId,
                              beforeLevel: old.beforeLevel,
                          }
                        : action
                );
            }
            if (action.type === "MOVE" && !acquiredKeys.has(key)) {
                const old = moves.get(key);
                moves.set(key, old ? { ...action, from: old.from } : action);
            }
        }
        group.upgrades = [...upgrades.values()];
        group.builtInUpgrades = [...builtIns.values()];
        group.itemUpgrades = group.paths.filter((path) => upgradedItems.has(path.slot));
        group.moves = [...moves.values()].filter(
            (action) =>
                !samePosition(action.from, action.to) ||
                !sameId(
                    group.before.slots[action.from?.slot]?.itemId,
                    group.final.stage.equipment.slots[action.to?.slot]?.itemId
                )
        );
        group.configurationChanges = Object.keys(group.final.stage.equipment.slots).filter(
            (key) =>
                configured(group.before.slots[key]) !==
                configured(group.final.stage.equipment.slots[key])
        );
        group.prepareCount = purchases.length + acquired.length;
        group.upgradeCount =
            group.upgrades.length + group.itemUpgrades.length + group.builtInUpgrades.length;
        group.moveCount = group.moves.length;
        group.actionable =
            group.prepareCount + group.upgradeCount + group.moveCount > 0 ||
            group.paths.length > 0 ||
            group.isFinal;
        group.title = group.isFinal
            ? t("Docelowy build")
            : group.paths.length
              ? countSupplies(
                    group.paths.map((path) => ({
                        itemId: path.states.at(-1)?.itemId,
                        state: path.states.at(-1),
                    })),
                    (entry) => String(entry.itemId)
                )
                    .map(
                        (entry) =>
                            `${entry.count > 1 ? `${entry.count} × ` : ""}${itemName(entry.state, data, t)}`
                    )
                    .join(" · ")
              : index === 0
                ? t("Początek gry")
                : t("Konfiguracja kamieni");
    }
    return { groups };
};

export const nearestProgressionGroup = (groups, level, completed) =>
    groups.find(
        (group) => group.actionable && group.level >= level && !completed.has(group.level)
    ) ??
    groups.find((group) => group.actionable && !completed.has(group.level)) ??
    null;
