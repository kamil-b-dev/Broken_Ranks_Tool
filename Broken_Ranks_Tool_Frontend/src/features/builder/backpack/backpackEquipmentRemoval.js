import { SLOTS } from "../../../shared/domain/equipment/equipmentSlots";
import { equipmentRequestIdentity } from "../../../shared/domain/equipment/equipmentRequestIdentity";
import { MAX_BACKPACK_ENTRIES, normalizeBackpack } from "./backpackDomain";
import { validateBackpackEquipmentPlacement } from "./backpackEquipmentTransfer";

export const removalKey = (kind, slotKey, zone) => (slotKey ? `${slotKey}:${zone}` : `all:${kind}`);
const emptySlot = () => ({
    itemId: "",
    itemStars: 1,
    orbIds: [],
    orbLevels: [],
    drifIds: [],
    drifLevels: {},
});
const snapshot = (slot) =>
    normalizeBackpack([
        {
            id: "snapshot",
            kind: "ITEM",
            equipment: {
                itemId: slot.itemId,
                itemStars: Number(slot.itemStars ?? 1),
                orbIds: [...(slot.orbIds || [])],
                orbLevels: (slot.orbIds || []).map((id, index) =>
                    id ? Number(slot.orbLevels?.[index] ?? 1) : null
                ),
                drifIds: [...(slot.drifIds || [])],
                drifLevels: Object.fromEntries(
                    (slot.drifIds || []).flatMap((id, index) =>
                        id ? [[index, Number(slot.drifLevels?.[index] ?? 1)]] : []
                    )
                ),
            },
        },
    ])[0].equipment;
const comparable = (slot, change) => {
    if (change.kind === "DRIF")
        return JSON.stringify([
            String(slot?.itemId || ""),
            ...change.indices.map((index) => [
                String(slot?.drifIds?.[index] || ""),
                slot?.drifIds?.[index] ? Number(slot.drifLevels?.[index] ?? 1) : null,
            ]),
        ]);
    return equipmentRequestIdentity({
        slots: {
            [change.slotKey]:
                change.kind === "ITEM"
                    ? slot
                    : {
                          itemId: slot?.itemId,
                          itemStars: 1,
                          orbIds: slot?.orbIds,
                          orbLevels: slot?.orbLevels,
                          drifIds: [],
                          drifLevels: {},
                      },
        },
    });
};
const entryIdentity = (entry) =>
    entry.kind === "ITEM"
        ? JSON.stringify([
              entry.id,
              entry.kind,
              equipmentRequestIdentity({ slots: { item: entry.equipment } }),
          ])
        : JSON.stringify(entry);

/** Transfers owned occurrences atomically; built-in drifs remain attached to their item. */
export const prepareEquipmentRemoval = ({
    backpack,
    requestData,
    data,
    lockedDrifs = {},
    kind,
    slotKey,
    zone,
    createId = () => crypto.randomUUID(),
}) => {
    normalizeBackpack(backpack);
    if (!["ITEM", "ORB", "DRIF"].includes(kind)) throw new Error("Nieznany rodzaj wyposażenia.");
    if (slotKey && !SLOTS.some((slot) => slot.key === slotKey))
        throw new Error("Nieznany slot ekwipunku.");
    const changes = [];
    const entries = [];
    const slots = { ...requestData.slots };
    const nextLocks = { ...lockedDrifs };
    for (const definition of SLOTS) {
        const key = definition.key;
        if (slotKey && key !== slotKey) continue;
        const previous = slots[key];
        if (!previous?.itemId) continue;
        const item = data.items.find(
            (candidate) => String(candidate.id) === String(previous.itemId)
        );
        if (!item) throw new Error("Przedmiot nie znajduje się w aktualnym katalogu.");
        if (kind === "DRIF" && ["EPIC", "SET"].includes(item.rarity)) continue;
        const before = snapshot(previous);
        const after = snapshot(previous);
        let indices = [];
        if (kind === "ITEM") {
            entries.push({ id: createId(), kind, equipment: before });
            indices = (before.drifIds || []).flatMap((id, index) => (id ? [index] : []));
            slots[key] = emptySlot();
        } else {
            const ids = kind === "ORB" ? after.orbIds : after.drifIds;
            const levels = kind === "ORB" ? after.orbLevels : after.drifLevels;
            const position =
                kind === "ORB"
                    ? ["orb1", "orb2"].indexOf(zone)
                    : /^drif-[0-7]$/.test(zone || "")
                      ? Number(zone.slice(5))
                      : -1;
            if (slotKey && position < 0) throw new Error("Nieznane gniazdo kamienia.");
            indices = ids.flatMap((id, index) =>
                id && (!slotKey || index === position) ? [index] : []
            );
            for (const index of indices)
                entries.push({
                    id: createId(),
                    kind,
                    templateId: ids[index],
                    level: levels[index] ?? 1,
                });
            if (!indices.length) continue;
            if (kind === "ORB") {
                after.orbIds = ids.filter((_, index) => !indices.includes(index));
                after.orbLevels = levels.filter((_, index) => !indices.includes(index));
            } else {
                for (const index of indices) {
                    ids[index] = null;
                    delete levels[index];
                }
            }
            slots[key] = after;
        }
        const clearedLocks =
            kind === "ITEM"
                ? [...(lockedDrifs[key] || [])]
                : kind === "DRIF"
                  ? (lockedDrifs[key] || []).filter((index) => indices.includes(index))
                  : [];
        nextLocks[key] = (lockedDrifs[key] || []).filter((index) => !clearedLocks.includes(index));
        changes.push({ slotKey: key, kind, before, after: slots[key], indices, clearedLocks });
    }
    if (!entries.length) throw new Error("Brak rzeczy do przeniesienia do plecaka.");
    if (backpack.length + entries.length > MAX_BACKPACK_ENTRIES)
        throw new Error(
            `Plecak mieści maksymalnie ${MAX_BACKPACK_ENTRIES} obiektów. Zwolnij miejsce przed zdjęciem wyposażenia.`
        );
    const added = normalizeBackpack(entries);
    return {
        requestData: { ...requestData, slots },
        backpack: normalizeBackpack([...backpack, ...added]),
        lockedDrifs: nextLocks,
        undo: { key: removalKey(kind, slotKey, zone), changes, entries: added },
    };
};

/** Restores only the removed fields and consumes exactly the returned backpack occurrences. */
export const prepareEquipmentRemovalUndo = ({
    backpack,
    requestData,
    lockedDrifs = {},
    undo,
    data,
    gameRules,
}) => {
    normalizeBackpack(backpack);
    if (!undo) throw new Error("Brak operacji do cofnięcia.");
    for (const entry of undo.entries) {
        const current = backpack.find((candidate) => candidate.id === entry.id);
        if (!current || entryIdentity(normalizeBackpack([current])[0]) !== entryIdentity(entry))
            throw new Error(
                "Przeniesiona rzecz została zmieniona lub nie znajduje się już w plecaku."
            );
    }
    const slots = { ...requestData.slots };
    const nextLocks = { ...lockedDrifs };
    for (const change of undo.changes) {
        const current = slots[change.slotKey];
        if (comparable(current, change) !== comparable(change.after, change))
            throw new Error(
                "Miejsce po zdjętej rzeczy zostało zmienione. Cofnięcie nadpisałoby późniejsze zmiany."
            );
        if (change.kind === "ITEM") slots[change.slotKey] = change.before;
        else {
            const restored = snapshot(current);
            if (change.kind === "ORB") {
                restored.orbIds = change.before.orbIds;
                restored.orbLevels = change.before.orbLevels;
            } else
                for (const index of change.indices) {
                    restored.drifIds[index] = change.before.drifIds[index];
                    restored.drifLevels[index] = change.before.drifLevels[index];
                }
            slots[change.slotKey] = restored;
        }
        nextLocks[change.slotKey] = [
            ...new Set([...(nextLocks[change.slotKey] || []), ...change.clearedLocks]),
        ].sort((a, b) => a - b);
    }
    const nextRequest = { ...requestData, slots };
    for (const change of undo.changes)
        validateBackpackEquipmentPlacement(
            nextRequest,
            change.slotKey,
            slots[change.slotKey],
            data,
            gameRules
        );
    const consumed = new Set(undo.entries.map((entry) => entry.id));
    return {
        requestData: nextRequest,
        backpack: backpack.filter((entry) => !consumed.has(entry.id)),
        lockedDrifs: nextLocks,
    };
};
