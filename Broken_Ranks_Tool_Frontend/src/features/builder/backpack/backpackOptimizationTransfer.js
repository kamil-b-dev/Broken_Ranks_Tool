import { normalizeBackpack, MAX_BACKPACK_ENTRIES } from "./backpackSerialization.js";
import { SLOTS } from "../../../shared/domain/equipment/equipmentSlots";
import { validateImportedBuild } from "../../builds/buildImportValidation";

const stonesIdentity = (ids = [], levels = {}) =>
    JSON.stringify(
        ids.flatMap((id, index) =>
            id == null || id === "" ? [] : [[index, String(id), Number(levels[index] ?? 1)]]
        )
    );
const equipmentIdentity = (slot) =>
    JSON.stringify([
        String(slot?.itemId || ""),
        Number(slot?.itemStars ?? 1),
        stonesIdentity(slot?.orbIds, slot?.orbLevels),
    ]);

/** Transfers only the explicit occurrences used by the final backpack substitutions. */
export const applyBackpackOptimization = ({
    backpack,
    previousSlots,
    nextSlots,
    backpackDrifUsages,
    lockedSlots = [],
    lockedDrifs = {},
    data,
    gameRules,
    targetSlots,
    builtInSlots = [],
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
    const keys = new Set([...Object.keys(previousSlots), ...Object.keys(nextSlots)]);
    for (const key of keys) {
        const previous = previousSlots[key];
        const next = nextSlots[key];
        if (
            !SLOTS.some((slot) => slot.key === key) ||
            equipmentIdentity(previous) !== equipmentIdentity(next)
        )
            throw new Error(
                "Wynik zmienia przedmiot, gwiazdki lub orby poza zakresem optymalizacji drifów."
            );
        if (targetSlots && equipmentIdentity(previous) !== equipmentIdentity(targetSlots[key]))
            throw new Error(
                "Build docelowy zmienia przedmiot, gwiazdki lub orby poza zakresem optymalizacji drifów."
            );
        if (
            lockedSlots.includes(key) &&
            stonesIdentity(previous?.drifIds, previous?.drifLevels) !==
                stonesIdentity(next?.drifIds, next?.drifLevels)
        )
            throw new Error("Wynik narusza blokadę slota.");
        for (const index of lockedDrifs?.[key] || []) {
            if (
                String(previous?.drifIds?.[index] || "") !== String(next?.drifIds?.[index] || "") ||
                (previous?.drifIds?.[index] &&
                    Number(previous?.drifLevels?.[index] ?? 1) !==
                        Number(next?.drifLevels?.[index] ?? 1))
            )
                throw new Error("Wynik narusza blokadę drifa.");
        }
    }
    if (data)
        validateImportedBuild(
            { requestData: { slots: nextSlots } },
            { ...data, gameRules: gameRules || data.gameRules || {} }
        );
    if (data && targetSlots)
        validateImportedBuild(
            { requestData: { slots: targetSlots } },
            { ...data, gameRules: gameRules || data.gameRules || {} }
        );
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
            builtInSlots.includes(slotKey) ||
            (lockedDrifs?.[slotKey] || []).includes(drifIndex) ||
            String(destination.drifIds?.[drifIndex]) !== String(owned.templateId) ||
            Number(destination.drifLevels?.[drifIndex] ?? 1) !== owned.level
        )
            throw new Error("Wynik nie odpowiada zaznaczonym drifom plecaka lub narusza blokadę.");
        if (targetSlots) {
            const targetId = targetSlots[slotKey]?.drifIds?.[drifIndex];
            const target = data?.drifs?.find((drif) => String(drif.id) === String(targetId));
            const actual = data?.drifs?.find(
                (drif) => String(drif.id) === String(owned.templateId)
            );
            if (
                !targetId ||
                (data
                    ? !target ||
                      !actual ||
                      target.bonusType !== actual.bonusType ||
                      target.size !== actual.size
                    : String(targetId) !== String(owned.templateId))
            )
                throw new Error(
                    "Drif z plecaka nie pasuje do rodzaju i rozmiaru drifa docelowego."
                );
        }
        consumed.add(entryId);
        positions.add(position);
    }
    for (const [key, previous] of Object.entries(previousSlots)) {
        const slot = nextSlots[key];
        if (!slot?.itemId && !previous?.itemId) continue;
        if (!previous?.itemId || String(previous.itemId) !== String(slot?.itemId))
            throw new Error("Wynik zmienia przedmiot poza zakresem optymalizacji drifów.");
        if (lockedSlots.includes(key) || builtInSlots.includes(key)) continue;
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
