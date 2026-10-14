import { SLOTS } from "../../../shared/domain/equipment/equipmentSlots";
import { validateImportedBuild } from "../../builds/buildImportValidation";
import { backpackTemplate, normalizeBackpack } from "./backpackDomain";

export const BACKPACK_RESOURCE_SOURCE = "backpack";

const equipmentSnapshot = (slot) => ({
    itemId: slot.itemId,
    itemStars: slot.itemStars ?? 1,
    orbIds: [...(slot.orbIds || [])],
    orbLevels: [...(slot.orbLevels || [])],
    drifIds: [...(slot.drifIds || [])],
    drifLevels: { ...(slot.drifLevels || {}) },
});

/** Resolves an occurrence from current state; drag payloads never supply its configuration. */
const preparePlacement = ({
    backpack,
    requestData,
    data,
    gameRules,
    entryId,
    slotKey,
    zone = "item",
    transientEntryId,
}) => {
    if (transientEntryId) {
        const transient = backpack.filter((entry) => entry.id === transientEntryId);
        if (transient.length !== 1 || transientEntryId !== entryId)
            throw new Error("Niepoprawne wystąpienie kamienia z katalogu.");
        normalizeBackpack(backpack.filter((entry) => entry.id !== transientEntryId));
        normalizeBackpack(transient);
    } else normalizeBackpack(backpack);
    const storedEntry = backpack.find((candidate) => candidate.id === entryId);
    if (!storedEntry) throw new Error("Ta rzecz nie znajduje się już w plecaku.");
    const entry = normalizeBackpack([storedEntry])[0];
    const template = backpackTemplate(entry, data);
    if (!template) throw new Error("Rzecz nie znajduje się w aktualnym katalogu.");
    const definition = SLOTS.find((slot) => slot.key === slotKey);
    if (!definition) throw new Error("Nieznany slot ekwipunku.");
    const previous = requestData.slots?.[slotKey];
    let equipment;
    let returned = null;
    if (zone === "item" && entry.kind === "ITEM") {
        equipment = normalizeBackpack([entry])[0].equipment;
        if (previous?.itemId) returned = { kind: "ITEM", equipment: equipmentSnapshot(previous) };
    } else {
        if (!previous?.itemId) throw new Error("Najpierw wybierz przedmiot w tym slocie.");
        equipment = equipmentSnapshot(previous);
        const item = data.items.find(
            (candidate) => String(candidate.id) === String(previous.itemId)
        );
        let index;
        let ids;
        let levels;
        if (entry.kind === "ORB" && ["orb1", "orb2"].includes(zone)) {
            index = zone === "orb1" ? 0 : 1;
            ids = equipment.orbIds;
            levels = equipment.orbLevels;
            if (index === 1 && !ids[0]) throw new Error("Najpierw umieść pierwszy orb.");
        } else if (entry.kind === "DRIF" && /^drif-\d+$/.test(zone)) {
            if (["EPIC", "SET"].includes(item?.rarity))
                throw new Error("Wbudowanych drifów nie można zastąpić kamieniem z plecaka.");
            index = Number(zone.slice(5));
            if (index > 7) throw new Error("Nieznane gniazdo drifa.");
            ids = equipment.drifIds;
            levels = equipment.drifLevels;
        } else throw new Error("Ta rzecz nie pasuje do wybranego miejsca.");
        if (ids[index])
            returned = {
                kind: entry.kind,
                templateId: ids[index],
                level: Number(levels[index]) || 1,
            };
        while (ids.length <= index) ids.push(null);
        ids[index] = entry.templateId;
        levels[index] = entry.level;
    }
    validateBackpackEquipmentPlacement(requestData, slotKey, equipment, data, gameRules);
    return { equipment, returned };
};

export const validateBackpackEquipmentPlacement = (
    requestData,
    slotKey,
    equipment,
    data,
    gameRules
) => {
    validateImportedBuild(
        { requestData: { slots: { [slotKey]: equipment } } },
        { ...data, gameRules }
    );
    const newOrbTypes = new Set(
        equipment.orbIds
            .filter(Boolean)
            .map((id) => data.orbs.find((orb) => String(orb.id) === String(id))?.bonusType)
    );
    for (const [otherKey, otherSlot] of Object.entries(requestData.slots || {})) {
        if (otherKey === slotKey) continue;
        for (const id of otherSlot.orbIds || []) {
            const orb = data.orbs.find((candidate) => String(candidate.id) === String(id));
            if (orb && newOrbTypes.has(orb.bonusType)) {
                const label = SLOTS.find((slot) => slot.key === otherKey)?.label || otherKey;
                throw new Error(
                    `Typ orba „${gameRules.bonusTranslations?.[orb.bonusType] || orb.name || orb.bonusType}” jest już użyty w slocie ${label}.`
                );
            }
        }
    }
};

export const prepareBackpackEquip = (options) => {
    const { equipment, returned } = preparePlacement(options);
    const { backpack, entryId, requestData, slotKey } = options;
    const returnedEntry = returned
        ? { ...returned, id: options.returnedId || crypto.randomUUID() }
        : null;
    const nextBackpack = backpack.flatMap((candidate) =>
        candidate.id !== entryId ? [candidate] : returnedEntry ? [returnedEntry] : []
    );
    return {
        requestData: { ...requestData, slots: { ...requestData.slots, [slotKey]: equipment } },
        backpack: normalizeBackpack(nextBackpack),
    };
};

export const backpackEquipWarning = (options) => {
    try {
        preparePlacement(options);
        return null;
    } catch (error) {
        return error.message;
    }
};

export const backpackDragResource = (entry, data) => {
    const template = backpackTemplate(entry, data);
    return template
        ? {
              id: template.id,
              dragType: { ITEM: "items", ORB: "orbs", DRIF: "drifs" }[entry.kind],
              source: BACKPACK_RESOURCE_SOURCE,
              entryId: entry.id,
          }
        : null;
};
