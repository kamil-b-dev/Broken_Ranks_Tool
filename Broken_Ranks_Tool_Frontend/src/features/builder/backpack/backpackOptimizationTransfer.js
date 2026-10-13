import { normalizeBackpack, MAX_BACKPACK_ENTRIES } from "./backpackSerialization.js";

/** Transfers only the explicit occurrences used by the final backpack substitutions. */
export const applyBackpackOptimization = ({
    backpack,
    previousSlots,
    nextSlots,
    backpackDrifUsages,
    lockedSlots = [],
    lockedDrifs = {},
}) => {
    if (!Array.isArray(backpackDrifUsages))
        throw new Error("Wynik nie zawiera listy drifów użytych z plecaka.");
    const pool = new Map(
        normalizeBackpack(backpack)
            .filter((entry) => entry.kind === "DRIF" && entry.sendToBackend === true)
            .map((entry) => [entry.id, entry])
    );
    const consumed = new Set();
    const positions = new Set();
    const returned = [];
    for (const usage of backpackDrifUsages) {
        const { entryId, slotKey, drifIndex } = usage || {};
        const owned = pool.get(entryId);
        const destination = nextSlots[slotKey];
        const position = `${slotKey}:${drifIndex}`;
        if (
            !owned ||
            consumed.has(entryId) ||
            positions.has(position) ||
            !Number.isInteger(drifIndex) ||
            drifIndex < 0 ||
            !destination?.itemId ||
            lockedSlots.includes(slotKey) ||
            (lockedDrifs?.[slotKey] || []).includes(drifIndex) ||
            String(destination.drifIds?.[drifIndex]) !== String(owned.templateId) ||
            Number(destination.drifLevels?.[drifIndex] ?? 1) !== owned.level
        )
            throw new Error("Wynik nie odpowiada zaznaczonym drifom plecaka lub narusza blokadę.");
        consumed.add(entryId);
        positions.add(position);
    }
    for (const [key, previous] of Object.entries(previousSlots)) {
        const slot = nextSlots[key];
        if (!slot?.itemId && !previous?.itemId) continue;
        if (!previous?.itemId || String(previous.itemId) !== String(slot?.itemId))
            throw new Error("Wynik zmienia przedmiot poza zakresem optymalizacji drifów.");
        if (lockedSlots.includes(key)) continue;
        const preserved = new Set(lockedDrifs?.[key] || []);
        for (let index = 0; index < (previous.drifIds || []).length; index++) {
            if (preserved.has(index) || !previous.drifIds[index]) continue;
            returned.push({
                id: crypto.randomUUID(),
                kind: "DRIF",
                templateId: previous.drifIds[index],
                level: Number(previous.drifLevels?.[index] ?? 1),
            });
        }
    }
    const next = [...backpack.filter((entry) => !consumed.has(entry.id)), ...returned];
    if (next.length > MAX_BACKPACK_ENTRIES)
        throw new Error(
            `Brak miejsca na zdjęte drify. Plecak mieści maksymalnie ${MAX_BACKPACK_ENTRIES} slotów.`
        );
    return normalizeBackpack(next);
};
