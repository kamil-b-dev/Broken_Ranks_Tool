import { normalizeBackpack, MAX_BACKPACK_ENTRIES } from "./backpackSerialization";
import { applyBackpackOptimization } from "./backpackOptimizationTransfer";
import {
    SIZE_INDEX,
    getDrifMaxLevel,
    calculateItemCapacity,
    calculateMaximumDrifSlots,
    ROMAN_TO_INT,
} from "../../../shared/domain/equipment/equipmentRules";

const drifIdentity = (slot) =>
    JSON.stringify(
        (slot?.drifIds || []).map((id, index) =>
            id == null || id === "" ? null : [String(id), Number(slot?.drifLevels?.[index] ?? 1)]
        )
    );

/** Validates every source and destination before publishing either inventory. */
export const applyReorganization = ({ reorganizationDrifUsages, ...input }) => {
    if (!Array.isArray(reorganizationDrifUsages))
        throw new Error("Wynik reorganizacji nie zawiera źródeł drifów.");
    const backpack = normalizeBackpack(input.backpack);
    const fixed = (key, index) =>
        input.builtInSlots.includes(key) ||
        input.lockedSlots.includes(key) ||
        (input.lockedDrifs?.[key] || []).includes(index);
    const equipped = new Map();
    for (const [key, slot] of Object.entries(input.previousSlots)) {
        (slot?.drifIds || []).forEach((id, index) => {
            if (id && !fixed(key, index))
                equipped.set(`${key}:${index}`, {
                    templateId: id,
                    level: Number(slot.drifLevels?.[index] ?? 1),
                });
        });
    }
    const usedEquipped = new Set();
    const options = input.reorganizationOptions;
    const operational = ["UPGRADE", "INSERT", "RESERVE"].includes(options?.task);
    const maxMoves = options?.maxMoves ?? 50;
    if (operational && (!Number.isInteger(maxMoves) || maxMoves < 1 || maxMoves > 50))
        throw new Error("Limit przełożeń musi być liczbą całkowitą od 1 do 50.");
    const upgrades =
        options?.task === "UPGRADE"
            ? options.upgrades || (options.upgrade ? [options.upgrade] : [])
            : [];
    const upgradeMap = new Map();
    for (const upgrade of upgrades) {
        const upgradeKey = upgrade.sourceSlotKey + ":" + upgrade.sourceDrifIndex;
        const source = equipped.get(upgradeKey);
        const original = input.data?.drifs?.find(
            (drif) => String(drif.id) === String(source?.templateId)
        );
        const target = input.data?.drifs?.find(
            (drif) => String(drif.id) === String(upgrade?.targetTemplateId)
        );
        if (
            !source ||
            !original ||
            !target ||
            upgradeMap.has(upgradeKey) ||
            original.bonusType !== target.bonusType ||
            SIZE_INDEX[target.size] < SIZE_INDEX[original.size] ||
            !Number.isInteger(upgrade.targetLevel) ||
            upgrade.targetLevel < source.level ||
            upgrade.targetLevel > getDrifMaxLevel(target.size) ||
            (!upgrade.maximizeLevel &&
                upgrade.targetLevel === source.level &&
                target.size === original.size)
        )
            throw new Error("Niepoprawny cel ulepszenia konkretnego drifa.");
        upgradeMap.set(upgradeKey, upgrade);
    }
    if (options?.task === "UPGRADE" && !upgrades.length)
        throw new Error("Brak kamieni do ulepszenia.");
    const destinations = new Set();
    const backpackUsages = [];
    for (const usage of reorganizationDrifUsages) {
        const { entryId, sourceSlotKey, sourceDrifIndex, slotKey, drifIndex } = usage || {};
        const position = `${slotKey}:${drifIndex}`;
        const destination = input.nextSlots[slotKey];
        if (
            !Number.isInteger(drifIndex) ||
            drifIndex < 0 ||
            !destination?.itemId ||
            fixed(slotKey, drifIndex) ||
            destinations.has(position) ||
            !destination.drifIds?.[drifIndex]
        )
            throw new Error("Reorganizacja zawiera niepoprawne lub powtórzone gniazdo docelowe.");
        destinations.add(position);
        if (entryId != null) {
            if (typeof entryId !== "string" || sourceSlotKey != null || sourceDrifIndex != null)
                throw new Error("Drif reorganizacji ma niejednoznaczne źródło.");
            if (
                ["UPGRADE", "RESERVE"].includes(options?.task) ||
                (options?.task === "INSERT" && entryId !== options.insertEntryId)
            )
                throw new Error("To zadanie nie pozwala użyć tego drifa z plecaka.");
            if (input.allowedBackpackIds && !input.allowedBackpackIds.includes(entryId))
                throw new Error("Drif plecaka nie należał do wybranej puli.");
            backpackUsages.push({ entryId, slotKey, drifIndex });
        } else {
            const sourceKey = `${sourceSlotKey}:${sourceDrifIndex}`;
            const source = equipped.get(sourceKey);
            const upgrade = upgradeMap.get(sourceKey);
            const actualLevel = Number(destination.drifLevels?.[drifIndex] ?? 1);
            const expected = upgrade
                ? {
                      templateId: upgrade.targetTemplateId,
                      level:
                          upgrade.maximizeLevel &&
                          actualLevel >= source.level &&
                          actualLevel <= upgrade.targetLevel
                              ? actualLevel
                              : upgrade.targetLevel,
                  }
                : source;
            if (
                !Number.isInteger(sourceDrifIndex) ||
                !source ||
                usedEquipped.has(sourceKey) ||
                String(expected.templateId) !== String(destination.drifIds[drifIndex]) ||
                expected.level !== Number(destination.drifLevels?.[drifIndex] ?? 1)
            )
                throw new Error(
                    "Reorganizacja używa nieposiadanego drifa lub zmienia jego poziom."
                );
            usedEquipped.add(sourceKey);
        }
    }
    const movedEquipped = reorganizationDrifUsages.filter(
        (usage) =>
            usage.entryId == null &&
            (usage.sourceSlotKey !== usage.slotKey || usage.sourceDrifIndex !== usage.drifIndex)
    ).length;
    const moveCount = movedEquipped + backpackUsages.length + equipped.size - usedEquipped.size;
    if (operational && moveCount > maxMoves)
        throw new Error("Wynik przekracza wybrany limit przełożeń.");
    if ([...upgradeMap.keys()].some((key) => !usedEquipped.has(key)))
        throw new Error("Wynik pomija wskazany drif do ulepszenia.");
    if (
        options?.task === "INSERT" &&
        !backpackUsages.some((usage) => usage.entryId === options.insertEntryId)
    )
        throw new Error("Wynik pomija wybrany drif z plecaka.");
    if (options?.task === "RESERVE") {
        const reservation = options.reservation;
        const slot = input.nextSlots[reservation?.slotKey];
        const item = input.data?.items?.find((item) => String(item.id) === String(slot?.itemId));
        const slots = calculateMaximumDrifSlots({
            hasItem: Boolean(item),
            isEpicOrSet: ["EPIC", "SET"].includes(item?.rarity),
            tier: ROMAN_TO_INT[item?.tier] || Number(item?.tier),
            stars: Number(slot?.itemStars ?? 1),
        });
        const usedPower = (slot?.drifIds || []).reduce((sum, id, index) => {
            const drif = input.data?.drifs?.find((drif) => String(drif.id) === String(id));
            const level = Number(slot.drifLevels?.[index] ?? 1);
            return (
                sum +
                (Number(
                    (input.gameRules || input.data?.gameRules)?.drifBasePowers?.[drif?.bonusType]
                ) || 0) *
                    (level <= 6 ? 1 : level <= 11 ? 2 : level <= 16 ? 3 : 4)
            );
        }, 0);
        if (
            !item ||
            ["EPIC", "SET"].includes(item.rarity) ||
            slots - (slot.drifIds || []).filter(Boolean).length < reservation.freeSockets ||
            calculateItemCapacity(item, slot.itemStars) - usedPower < reservation.freeCapacity
        )
            throw new Error("Wynik nie zostawia wymaganego miejsca w przedmiocie.");
    }
    if (options && !options.allowUnequip && usedEquipped.size !== equipped.size)
        throw new Error("Wynik odkłada założone drify bez zgody użytkownika.");
    for (const [key, slot] of Object.entries(input.nextSlots)) {
        (slot?.drifIds || []).forEach((id, index) => {
            if (id && !fixed(key, index) && !destinations.has(`${key}:${index}`))
                throw new Error("Brak źródła drifa w wyniku reorganizacji.");
        });
        if (input.builtInSlots.includes(key)) {
            const previous = input.previousSlots[key];
            if (drifIdentity(slot) !== drifIdentity(previous))
                throw new Error("Reorganizacja zmienia wbudowane drify.");
        }
    }
    // Reuse domain, item, orb, lock and explicit backpack-occurrence validation.
    // Remove moved equipped sources from the return list so they cannot be duplicated.
    const previousSlots = Object.fromEntries(
        Object.entries(input.previousSlots).map(([key, slot]) => {
            const drifIds = [...(slot.drifIds || [])];
            const drifLevels = { ...(slot.drifLevels || {}) };
            drifIds.forEach((id, index) => {
                if (usedEquipped.has(`${key}:${index}`)) {
                    drifIds[index] = null;
                    delete drifLevels[index];
                }
            });
            return [key, { ...slot, drifIds, drifLevels }];
        })
    );
    const next = applyBackpackOptimization({
        ...input,
        backpack: backpack.map((entry) =>
            options?.task === "INSERT" && entry.id === options.insertEntryId
                ? { ...entry, sendToBackend: true }
                : entry
        ),
        previousSlots,
        backpackDrifUsages: backpackUsages,
        targetSlots: undefined,
    });
    if (next.length > MAX_BACKPACK_ENTRIES) throw new Error("Brak miejsca na nieużyte drify.");
    return next;
};
