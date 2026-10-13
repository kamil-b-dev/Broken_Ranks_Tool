export const BACKPACK_KINDS = ["ITEM", "ORB", "DRIF"];
export const MAX_BACKPACK_ENTRIES = 200;
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const fail = () => {
    throw new Error("Plecak zawiera niepoprawne dane.");
};
const identifier = (value) => {
    if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) return String(value);
    if (typeof value === "string" && /^[1-9]\d*$/.test(value)) return value;
    return fail();
};
const integer = (value, max) => {
    if (!Number.isInteger(value) || value < 1 || value > max) fail();
    return value;
};
const ids = (value, max) => {
    if (!Array.isArray(value) || value.length > max) fail();
    return value.map((id) => (id == null || id === "" ? null : identifier(id)));
};

/** Wire normalization validates structure; unfinished equipment is preserved for later editing. */
export const normalizeBackpack = (entries = []) => {
    if (!Array.isArray(entries)) fail();
    if (entries.length > MAX_BACKPACK_ENTRIES)
        throw new Error(`Plecak mieści maksymalnie ${MAX_BACKPACK_ENTRIES} slotów.`);
    const seen = new Set();
    return entries.map((entry) => {
        if (
            !isObject(entry) ||
            typeof entry.id !== "string" ||
            !entry.id.trim() ||
            entry.id.length > 128 ||
            seen.has(entry.id)
        )
            fail();
        seen.add(entry.id);
        if (!BACKPACK_KINDS.includes(entry.kind)) fail();
        if (Object.hasOwn(entry, "sendToBackend") && typeof entry.sendToBackend !== "boolean")
            fail();
        const selection =
            entry.kind === "DRIF" && entry.sendToBackend === true ? { sendToBackend: true } : {};
        if (entry.kind !== "ITEM")
            return {
                id: entry.id,
                kind: entry.kind,
                templateId: identifier(entry.templateId),
                level: integer(entry.level, entry.kind === "DRIF" ? 21 : 3),
                ...selection,
            };
        const slot = entry.equipment;
        if (!isObject(slot) || !isObject(slot.drifLevels)) fail();
        const orbIds = ids(slot.orbIds, 2);
        const drifIds = ids(slot.drifIds, 8);
        if (!Array.isArray(slot.orbLevels) || slot.orbLevels.length > 2) fail();
        const drifLevels = Object.fromEntries(
            Object.entries(slot.drifLevels).map(([index, level]) => {
                if (!/^[0-7]$/.test(index)) fail();
                return [index, integer(level, 21)];
            })
        );
        return {
            id: entry.id,
            kind: "ITEM",
            equipment: {
                itemId: identifier(slot.itemId),
                itemStars: integer(slot.itemStars, 9),
                orbIds,
                orbLevels: slot.orbLevels.map((level) =>
                    level == null ? null : integer(level, 3)
                ),
                drifIds,
                drifLevels,
            },
        };
    });
};
