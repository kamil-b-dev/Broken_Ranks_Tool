import {
    calculateMaximumDrifSlots,
    ROMAN_TO_INT,
} from "../../../shared/domain/equipment/equipmentRules";
import {
    backpackSlot,
    backpackTemplate,
    createBackpackEntry,
    MAX_BACKPACK_ENTRIES,
} from "./backpackDomain";
import {
    BACKPACK_RESOURCE_SOURCE,
    backpackEquipWarning,
    prepareBackpackEquip,
} from "./backpackEquipmentTransfer";
import { prepareEquipmentRemoval, prepareEquipmentRemovalUndo } from "./backpackEquipmentRemoval";

const inventoryItem = (entries, targetId, data) => {
    const target = entries.find((entry) => entry.id === targetId && entry.kind === "ITEM");
    if (!target) throw new Error("Wybierz przedmiot w plecaku.");
    const slot = backpackSlot(backpackTemplate(target, data));
    if (!slot) throw new Error("Przedmiot nie znajduje się w aktualnym katalogu.");
    return { target, slot, requestData: { slots: { [slot.key]: target.equipment } } };
};
const applyInventoryEquipment = (next, targetId, slotKey) =>
    next.backpack.map((entry) =>
        entry.id === targetId ? { ...entry, equipment: next.requestData.slots[slotKey] } : entry
    );

/** Extracts an owned stone without touching worn equipment or other inventory alternatives. */
export const removeBackpackStone = ({ entries, targetId, kind, zone, data, createId }) => {
    if (!["ORB", "DRIF"].includes(kind)) throw new Error("Można wyjąć orb albo zwykły drif.");
    const { slot, requestData } = inventoryItem(entries, targetId, data);
    const next = prepareEquipmentRemoval({
        backpack: entries,
        requestData,
        data,
        kind,
        slotKey: slot.key,
        zone,
        createId,
    });
    return {
        entries: applyInventoryEquipment(next, targetId, slot.key),
        undo: { ...next.undo, key: `${targetId}:${zone}`, targetId },
    };
};

export const undoBackpackStoneRemoval = ({ entries, undo, data, gameRules }) => {
    if (!undo) throw new Error("Brak operacji do cofnięcia.");
    const { slot, requestData } = inventoryItem(entries, undo.targetId, data);
    const next = prepareEquipmentRemovalUndo({
        backpack: entries,
        requestData,
        undo,
        data,
        gameRules,
    });
    return applyInventoryEquipment(next, undo.targetId, slot.key);
};

export const backpackStoneRemovalWarning = (input) => {
    try {
        let index = 0;
        removeBackpackStone({
            ...input,
            createId: () => {
                let id;
                do {
                    id = `preview-${++index}`;
                } while (input.entries.some((entry) => entry.id === id));
                return id;
            },
        });
        return null;
    } catch (error) {
        return error.message;
    }
};
export const backpackStoneRemovalUndoWarning = (input) => {
    try {
        undoBackpackStoneRemoval(input);
        return null;
    } catch (error) {
        return error.message;
    }
};

const placementOptions = ({ entries, data, gameRules, resource, targetId, zone }) => {
    const target = entries.find((entry) => entry.id === targetId && entry.kind === "ITEM");
    if (!target) throw new Error("Wybierz przedmiot w plecaku.");
    const item = backpackTemplate(target, data);
    const slot = backpackSlot(item);
    if (!slot) throw new Error("Przedmiot nie znajduje się w aktualnym katalogu.");
    const fromBackpack = resource?.source === BACKPACK_RESOURCE_SOURCE;
    let stone;
    if (fromBackpack) {
        stone = entries.find((entry) => entry.id === resource.entryId);
        if (!stone) throw new Error("Ta rzecz nie znajduje się już w plecaku.");
    } else {
        const kind = { drifs: "DRIF", orbs: "ORB" }[resource?.dragType];
        const template =
            kind &&
            data[resource.dragType].find(
                (candidate) => String(candidate.id) === String(resource.id)
            );
        if (!template || resource?.source)
            throw new Error("Nieznany kamień lub źródło przeciągania.");
        stone = createBackpackEntry(kind, template, data, gameRules);
    }
    if (!["DRIF", "ORB"].includes(stone.kind))
        throw new Error("Na przedmiot można przeciągnąć orb albo drif.");
    const template = backpackTemplate(stone, data);
    if (!template) throw new Error("Kamień nie znajduje się w aktualnym katalogu.");
    const backpack = fromBackpack ? entries : [...entries, stone];
    const base = {
        backpack,
        requestData: { slots: { [slot.key]: target.equipment } },
        data,
        gameRules,
        entryId: stone.id,
        slotKey: slot.key,
    };
    const ids = stone.kind === "DRIF" ? target.equipment.drifIds : target.equipment.orbIds;
    const templates = stone.kind === "DRIF" ? data.drifs : data.orbs;
    if (!zone) {
        const maximum =
            stone.kind === "ORB"
                ? item.rarity === "LEGENDARY"
                    ? 2
                    : 1
                : calculateMaximumDrifSlots({
                      hasItem: true,
                      isEpicOrSet: ["EPIC", "SET"].includes(item.rarity),
                      tier: ROMAN_TO_INT[item.tier] || 0,
                      stars: target.equipment.itemStars,
                  });
        if (maximum === 0)
            throw new Error("Wbudowanych drifów nie można zastąpić kamieniem z plecaka.");
        const socket = (index) => (stone.kind === "ORB" ? `orb${index + 1}` : `drif-${index}`);
        const matching = ids.findIndex(
            (id) =>
                id &&
                templates.find((candidate) => String(candidate.id) === String(id))?.bonusType ===
                    template.bonusType
        );
        if (matching >= 0) zone = socket(matching);
        else {
            const empty = Array.from({ length: maximum }, (_, index) => index).filter(
                (index) => !ids[index]
            );
            if (!empty.length)
                throw new Error(
                    "Brak wolnego gniazda. Upuść kamień na konkretny orb lub drif w przedmiocie albo wybierz gniazdo w edytorze."
                );
            zone =
                empty
                    .map(socket)
                    .find((candidate) => !backpackEquipWarning({ ...base, zone: candidate })) ||
                socket(empty[0]);
        }
    }
    const options = { ...base, zone };
    const warning = backpackEquipWarning(options);
    if (warning) throw new Error(warning);
    const index = zone.startsWith("orb") ? Number(zone.slice(3)) - 1 : Number(zone.slice(5));
    if (!fromBackpack && ids[index] && entries.length >= MAX_BACKPACK_ENTRIES)
        throw new Error(
            `Plecak mieści do ${MAX_BACKPACK_ENTRIES} obiektów. Zwolnij miejsce na zastępowany kamień.`
        );
    return { options, target };
};

/** Inventory stones move atomically; each alternative is validated independently of equipped gear. */
export const placeBackpackStone = (input) => {
    const { options, target } = placementOptions(input);
    const next = prepareBackpackEquip(options);
    const equipment = next.requestData.slots[options.slotKey];
    return next.backpack.map((entry) => (entry.id === target.id ? { ...entry, equipment } : entry));
};

export const backpackStoneDropWarning = (input) => {
    try {
        placementOptions(input);
        return null;
    } catch (error) {
        return error.message;
    }
};
