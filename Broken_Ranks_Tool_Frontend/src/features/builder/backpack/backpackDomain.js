import { SLOTS } from "../../../shared/domain/equipment/equipmentSlots";
import { getDrifMaxLevel, getOrbMaxLevel } from "../../../shared/domain/equipment/equipmentRules";
import { createBuiltInDrifs } from "../gear-slot/gearSlotDomain";
import { validateImportedBuild } from "../../builds/buildImportValidation";

import { BACKPACK_KINDS, normalizeBackpack } from "./backpackSerialization.js";
export {
    BACKPACK_KINDS,
    MAX_BACKPACK_ENTRIES,
    normalizeBackpack,
} from "./backpackSerialization.js";
const fail = () => {
    throw new Error("Plecak zawiera niepoprawne dane.");
};

export const backpackSlot = (item) =>
    SLOTS.find((slot) =>
        (Array.isArray(slot.cat) ? slot.cat : [slot.cat]).includes(item?.category)
    );
export const backpackTemplate = (entry, data) =>
    (entry?.kind === "ITEM" ? data.items : entry?.kind === "ORB" ? data.orbs : data.drifs)?.find(
        (template) =>
            String(template.id) ===
            String(entry?.kind === "ITEM" ? entry.equipment.itemId : entry?.templateId)
    );

export const createBackpackEntry = (kind, template, data, gameRules, id = crypto.randomUUID()) => {
    if (!BACKPACK_KINDS.includes(kind) || !template) fail();
    template = backpackTemplate(
        { kind, equipment: { itemId: template.id }, templateId: template.id },
        data
    );
    if (!template) throw new Error("Obiekt nie znajduje się w aktualnym katalogu.");
    const entry =
        kind === "ITEM"
            ? {
                  id,
                  kind,
                  equipment: {
                      itemId: template.id,
                      itemStars: 1,
                      orbIds: [],
                      orbLevels: [],
                      drifIds: createBuiltInDrifs({
                          item: template,
                          drifs: data.drifs,
                          epicBuiltInDrifs: gameRules.epicBuiltInDrifs || {},
                          bonusTranslations: gameRules.bonusTranslations || {},
                      }).map((drif) => drif.id),
                      drifLevels: {},
                  },
              }
            : { id, kind, templateId: template.id, level: 1 };
    return normalizeBackpack([entry])[0];
};

/** Each potential replacement is checked on its own, rather than as simultaneously worn equipment. */
export const backpackWarning = (entry, data, gameRules) => {
    const template = backpackTemplate(entry, data);
    if (!template) return "Obiekt nie znajduje się w aktualnym katalogu.";
    if (entry.kind !== "ITEM") {
        const sizes =
            entry.kind === "ORB"
                ? ["SUBORB", "BIORB", "MAGNIORB", "ARCYORB"]
                : ["SUBDRIF", "BIDRIF", "MAGNIDRIF", "ARCYDRIF"];
        if (!sizes.includes(template.size) || !template.bonusType)
            return "Kamień ma niepoprawny szablon w katalogu.";
        const maximum =
            entry.kind === "ORB" ? getOrbMaxLevel(template.size) : getDrifMaxLevel(template.size);
        return entry.level > maximum ? `Maksymalny poziom tego kamienia: ${maximum}.` : null;
    }
    const slot = backpackSlot(template);
    if (!slot) return "Przedmiot ma nieznaną kategorię.";
    try {
        validateImportedBuild(
            { requestData: { slots: { [slot.key]: entry.equipment } } },
            { ...data, gameRules }
        );
        return null;
    } catch (error) {
        if (error.message.includes("Drify przekraczają pojemność"))
            return `Drify przekraczają pojemność „${template.name}”.`;
        return error.message.replaceAll(`slocie ${slot.key}`, `przedmiocie „${template.name}”`);
    }
};

export const moveBackpackEntry = (entries, id, targetId) => {
    const from = entries.findIndex((entry) => entry.id === id);
    const to = entries.findIndex((entry) => entry.id === targetId);
    if (from < 0 || to < 0 || from === to) return entries;
    const next = [...entries];
    next.splice(to, 0, next.splice(from, 1)[0]);
    return next;
};
