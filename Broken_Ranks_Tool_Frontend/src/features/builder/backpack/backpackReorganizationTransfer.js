import { normalizeBackpack, MAX_BACKPACK_ENTRIES } from "./backpackSerialization";
import { applyBackpackOptimization } from "./backpackOptimizationTransfer";

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
            backpackUsages.push({ entryId, slotKey, drifIndex });
        } else {
            const sourceKey = `${sourceSlotKey}:${sourceDrifIndex}`;
            const source = equipped.get(sourceKey);
            if (
                !Number.isInteger(sourceDrifIndex) ||
                !source ||
                usedEquipped.has(sourceKey) ||
                String(source.templateId) !== String(destination.drifIds[drifIndex]) ||
                source.level !== Number(destination.drifLevels?.[drifIndex] ?? 1)
            )
                throw new Error(
                    "Reorganizacja używa nieposiadanego drifa lub zmienia jego poziom."
                );
            usedEquipped.add(sourceKey);
        }
    }
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
        backpack,
        previousSlots,
        backpackDrifUsages: backpackUsages,
        targetSlots: undefined,
    });
    if (next.length > MAX_BACKPACK_ENTRIES) throw new Error("Brak miejsca na nieużyte drify.");
    return next;
};
