import { findTemplate, itemName, SLOT_NAMES, stoneDescription } from "./progressionReport";

const samePosition = (left, right) =>
    left?.slot === right?.slot && left?.socketIndex === right?.socketIndex;

/** Group the existing transfer summary without changing operation order in the report. */
export function groupStoneTransfers(moves) {
    const destinations = new Map();
    for (const action of moves) {
        const slot = action.to?.slot ?? null;
        if (!destinations.has(slot)) destinations.set(slot, { slot, moves: [] });
        destinations.get(slot).moves.push(action);
    }
    const slots = Object.keys(SLOT_NAMES);
    return [...destinations.values()]
        .sort(
            (a, b) =>
                (a.slot ? slots.indexOf(a.slot) : slots.length) -
                (b.slot ? slots.indexOf(b.slot) : slots.length)
        )
        .map((destination) => ({
            ...destination,
            moves: destination.moves.toSorted(
                (a, b) =>
                    a.kind.localeCompare(b.kind) ||
                    (a.to?.socketIndex ?? 0) - (b.to?.socketIndex ?? 0)
            ),
        }));
}

export function stonePositionName(position, equipment, data, t) {
    if (!position) return t("Pula wolnych kamieni");
    return t("{0} ({1}, gniazdo {2})", [
        itemName(equipment.slots[position.slot], data, t),
        t(SLOT_NAMES[position.slot]),
        position.socketIndex + 1,
    ]);
}

function instanceOperations(action, kind, group) {
    return group.steps.flatMap(({ result, before }) =>
        (kind === "drif" ? result.actions : (result.orbActions ?? []))
            .filter((entry) => entry.instanceId === action.instanceId)
            .map((entry) => ({ action: entry, before, after: result.stage.equipment }))
    );
}

export function stoneActionContext(action, kind, group, data, t) {
    const operations = instanceOperations(action, kind, group);
    const lastMove = operations.findLast((entry) => entry.action.type === "MOVE");
    if (lastMove?.action.to)
        return t("Do przedmiotu: {0}", [
            stonePositionName(lastMove.action.to, lastMove.after, data, t),
        ]);
    const source = operations.find((entry) => entry.action.from);
    return source
        ? t("Wyjęty z: {0}", [stonePositionName(source.action.from, source.before, data, t)])
        : t("Pula wolnych kamieni");
}

/** Compare physical instances before describing a replacement, so an upgrade stays an upgrade. */
export function replacedStone(action, kind, group, data) {
    if (!action.to) return null;
    const { slot, socketIndex } = action.to;
    const before = group.before.slots[slot];
    const after = group.final.stage.equipment.slots[slot];
    if (before?.itemId == null || String(before.itemId) !== String(after?.itemId)) return null;
    if (
        ["EPIC", "SET"].includes(findTemplate(before.itemId, data.items)?.rarity) &&
        kind === "drif"
    )
        return null;
    const ids = kind === "drif" ? "drifIds" : "orbIds";
    const levels = kind === "drif" ? "drifLevels" : "orbLevels";
    const id = before[ids]?.[socketIndex];
    const level = before[levels]?.[socketIndex] ?? 1;
    if (id == null || (String(id) === String(action.templateId) && level === action.level))
        return null;
    const operations = instanceOperations(action, kind, group);
    const origin = operations.find((entry) => entry.action.from);
    if (origin && samePosition(origin.action.from, action.to)) return null;
    return { templateId: id, level };
}

/** Preserve every operation and the equipment snapshot on its own side of an item change. */
export function progressionInstructions(group, data, t) {
    return group.steps.flatMap((step) => {
        const { result, before } = step;
        const after = result.stage.equipment;
        const detach = (action) => action.type === "MOVE" && action.to == null;
        const describe = (action, kind) => {
            const stone = stoneDescription(kind, action.templateId, action.level, data, t);
            if (action.type === "ACQUIRE")
                return t("Pozyskaj {0}. {1}", [
                    stone,
                    stoneActionContext(action, kind, { steps: [step] }, data, t),
                ]);
            if (action.type === "UPGRADE")
                return t("Ulepsz {0} → {1}. {2}", [
                    stoneDescription(kind, action.beforeTemplateId, action.beforeLevel, data, t),
                    stone,
                    stoneActionContext(action, kind, { steps: [step] }, data, t),
                ]);
            if (!action.to)
                return t("Wyjmij {0} z przedmiotu {1}.", [
                    stone,
                    stonePositionName(action.from, before, data, t),
                ]);
            const destination = stonePositionName(action.to, after, data, t);
            if (action.from)
                return t("Przenieś {0} z przedmiotu {1} do przedmiotu {2}.", [
                    stone,
                    stonePositionName(action.from, before, data, t),
                    destination,
                ]);
            const replaced = replacedStone(
                action,
                kind,
                { ...group, before, final: result, steps: [step] },
                data
            );
            return replaced
                ? t("Zamień {0} na {1} w przedmiocie {2}.", [
                      stoneDescription(kind, replaced.templateId, replaced.level, data, t),
                      stone,
                      destination,
                  ])
                : t("Włóż {0} do przedmiotu {1}.", [stone, destination]);
        };
        const describeActions = (actions, kind) => actions.map((action) => describe(action, kind));
        return [
            ...describeActions(result.actions.filter(detach), "drif"),
            ...describeActions((result.orbActions ?? []).filter(detach), "orb"),
            ...result.equipmentChanges.map((text) => t(text)),
            ...describeActions(
                (result.orbActions ?? []).filter((action) => !detach(action)),
                "orb"
            ),
            ...describeActions(
                result.actions.filter((action) => !detach(action)),
                "drif"
            ),
        ];
    });
}
