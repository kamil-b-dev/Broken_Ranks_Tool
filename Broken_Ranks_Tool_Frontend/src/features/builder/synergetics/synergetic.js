export const SYNERGETIC_STATS = [
    "PŻ",
    "Mana",
    "Kondycja",
    "Siła",
    "Zręczność",
    "Moc",
    "Wiedza",
    "Inteligencja",
    "Obrażenia",
    "Pancerz sieczne",
    "Pancerz kłute",
    "Pancerz obuchowe",
    "Odporność energia",
    "Odporność ogień",
    "Odporność zimno",
    "Odporność uroki",
];
export const validateSynergeticSlot = (key, slot) => {
    const item = slot.synergetic;
    if (
        !["ring1", "ring2", "necklace"].includes(key) ||
        slot.itemId != null ||
        (slot.itemStars ?? 1) !== 1 ||
        [slot.drifIds, slot.orbIds].some(
            (ids) => ids != null && (!Array.isArray(ids) || ids.length)
        ) ||
        Object.keys(slot.drifLevels || {}).length ||
        (slot.orbLevels?.length ?? 0) ||
        !item ||
        typeof item.name !== "string" ||
        !item.name.trim() ||
        item.name.length > 64 ||
        !item.stats ||
        typeof item.stats !== "object" ||
        Array.isArray(item.stats) ||
        !Object.keys(item.stats).length ||
        Object.keys(item.stats).length > 16 ||
        Object.entries(item.stats).some(
            ([name, value]) =>
                !SYNERGETIC_STATS.includes(name) ||
                !Number.isInteger(value) ||
                value < 0 ||
                value > 50_000
        )
    )
        throw new Error(
            "Niepoprawny synergetyk. Wybierz pierścień lub naszyjnik bez kamieni oraz statystyki całkowite od 0 do 50000."
        );
};
