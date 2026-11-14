import { validateImportedBuild } from "../../builds/buildImportValidation";
import { getBuiltInDrifBonusTypes } from "../gear-slot/gearSlotDomain";

export const replacementRequest = (request, slotKey, item, data, keepStones = true) => {
    if (!item) throw new Error("Wybierz przedmiot do porównania.");
    const next = structuredClone(request);
    const previous = next.slots[slotKey] || {};
    const oldItem = data.items.find((entry) => String(entry.id) === String(previous.itemId));
    const builtIn = getBuiltInDrifBonusTypes(item, data.gameRules?.epicBuiltInDrifs);
    const carry =
        keepStones &&
        !["EPIC", "SET"].includes(oldItem?.rarity) &&
        !["EPIC", "SET"].includes(item.rarity);
    const slot = {
        itemId: item.id,
        itemStars: 1,
        orbIds: keepStones ? previous.orbIds || [] : [],
        orbLevels: keepStones ? previous.orbLevels || [] : [],
        drifIds: carry ? previous.drifIds || [] : [],
        drifLevels: carry ? previous.drifLevels || {} : {},
    };
    if (builtIn.length) {
        slot.drifIds = builtIn.map((type) => {
            const drif = data.drifs.find(
                (entry) => entry.bonusType === type && entry.size === "MAGNIDRIF"
            );
            if (!drif) throw new Error("Brak szablonu wbudowanego drifa.");
            return drif.id;
        });
        slot.drifLevels = Object.fromEntries(slot.drifIds.map((_, index) => [index, 1]));
    }
    next.slots[slotKey] = slot;
    validateImportedBuild({ requestData: next }, data);
    return next;
};

export const equipmentWearWarnings = (request, items, level, selectedClass = "AUTO") => {
    const weapon = items.find((item) => String(item.id) === String(request.slots?.weapon?.itemId));
    const profession =
        selectedClass === "AUTO" && weapon?.allowedClasses?.length === 1
            ? weapon.allowedClasses[0]
            : selectedClass;
    return Object.entries(request.slots || {}).flatMap(([slot, configuration]) => {
        const item = items.find((entry) => String(entry.id) === String(configuration?.itemId));
        if (!item) return [];
        const warnings = [];
        if (Number.isFinite(level) && item.reqLevel > level)
            warnings.push({ slot, name: item.name, reason: "level", required: item.reqLevel });
        if (
            profession &&
            profession !== "AUTO" &&
            item.allowedClasses?.length &&
            !item.allowedClasses.includes(profession)
        )
            warnings.push({ slot, name: item.name, reason: "profession" });
        return warnings;
    });
};
