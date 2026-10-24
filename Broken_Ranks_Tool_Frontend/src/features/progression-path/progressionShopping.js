import { itemName, itemUpgradeDescription, stoneDescription } from "./progressionReport";

/** Count acquisitions by physical identity; moves and upgrades never create purchases. */
export function progressionShoppingTasks(groups) {
    const tasks = [];
    const acquired = new Set();
    for (const group of groups) {
        for (const purchase of group.purchases) {
            for (let copy = 0; copy < purchase.count; copy++)
                tasks.push({
                    id: `item:${group.level}:${purchase.itemId}:${copy}`,
                    category: "items",
                    level: group.level,
                    itemId: purchase.itemId,
                });
        }
        for (const { result } of group.steps) {
            for (const [kind, actions] of [
                ["drif", result.actions],
                ["orb", result.orbActions ?? []],
            ]) {
                for (const action of actions) {
                    if (action.type !== "ACQUIRE") continue;
                    const id = `acquire:${kind}:${action.instanceId}`;
                    if (acquired.has(id)) continue;
                    acquired.add(id);
                    tasks.push({
                        ...action,
                        id,
                        category: "stones",
                        kind,
                        stageLevel: group.level,
                    });
                }
            }
        }
        for (const upgrade of group.upgrades)
            tasks.push({
                ...upgrade,
                id: `upgrade:${group.level}:${upgrade.kind}:${upgrade.instanceId}`,
                category: "upgrades",
                stageLevel: group.level,
            });
        for (const path of group.itemUpgrades)
            tasks.push({
                id: `stars:${group.level}:${path.slot}`,
                category: "upgrades",
                level: group.level,
                path,
            });
        for (const upgrade of group.builtInUpgrades)
            tasks.push({
                ...upgrade,
                id: `builtin:${group.level}:${upgrade.key}`,
                category: "upgrades",
                kind: "drif",
                builtIn: true,
                stageLevel: group.level,
            });
    }
    return tasks;
}

export const shoppingTaskLevel = (task) => task.stageLevel ?? task.level;

export function shoppingTaskLabel(task, data, t) {
    if (task.category === "items") return itemName({ itemId: task.itemId }, data, t);
    if (task.path) return itemUpgradeDescription(task.path, data, t);
    const after = stoneDescription(task.kind, task.templateId, task.level, data, t);
    if (task.category === "stones") return after;
    if (task.builtIn)
        return `${after} · ${t("Wbudowany")} · ${itemName({ itemId: task.itemId }, data, t)} · ${task.beforeLevel} → ${task.level}`;
    return `${stoneDescription(task.kind, task.beforeTemplateId, task.beforeLevel, data, t)} → ${after}`;
}

export function groupShoppingTasks(tasks) {
    const grouped = new Map();
    for (const task of tasks) {
        const key =
            task.category === "items"
                ? `item:${task.itemId}`
                : task.category === "stones"
                  ? `${task.kind}:${task.templateId}:${task.level}`
                  : task.id;
        if (!grouped.has(key)) grouped.set(key, { ...task, ids: [], levels: [] });
        const entry = grouped.get(key);
        entry.ids.push(task.id);
        entry.levels.push(shoppingTaskLevel(task));
    }
    return [...grouped.values()];
}

export function shoppingListText(entries, prepared, data, t) {
    return [
        t("Zakupy i ulepszenia ścieżki"),
        ...entries.map(
            (entry) =>
                `${entry.ids.every((id) => prepared.has(id)) ? "[x]" : "[ ]"} ${entry.ids.length} × ${shoppingTaskLabel(entry, data, t)} · ${t("Poziom")} ${[...new Set(entry.levels)].join(", ")}`
        ),
    ].join("\n");
}
