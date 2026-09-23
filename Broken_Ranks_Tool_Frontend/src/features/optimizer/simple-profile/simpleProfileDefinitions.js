export const SIMPLE_PROFILES = [
    { value: "BARBARIAN", label: "Barbarzyńca" },
    { value: "KNIGHT", label: "Rycerz" },
    { value: "ARCHER", label: "Łucznik" },
    { value: "FIRE_MAGE", label: "Mag Ognia" },
    { value: "DRUID", label: "Druid" },
    { value: "SHEED", label: "Sheed" },
    { value: "VOODOO", label: "Voodoo" },
];

export const SIMPLE_STYLES = [
    { value: "OFFENSIVE", label: "Ofensywny" },
    { value: "DEFENSIVE", label: "Defensywny" },
];

export const SIMPLE_ELEMENTS = [
    { value: "NONE", label: "Bez żywiołu" },
    { value: "FIRE", label: "Ogień" },
    { value: "FROST", label: "Zimno" },
    { value: "ENERGY", label: "Energia" },
];

const PROFILE_DEFAULTS = {
    BARBARIAN: { damageDrifs: 7, accuracyDrifs: 6, element: "FIRE" },
    KNIGHT: { damageDrifs: 6, accuracyDrifs: 5, style: "OFFENSIVE" },
    ARCHER: { damageDrifs: 7, accuracyDrifs: 7 },
    FIRE_MAGE: { damageDrifs: 7, accuracyDrifs: 6 },
    DRUID: { damageDrifs: 6, accuracyDrifs: 5, style: "OFFENSIVE" },
    SHEED: { damageDrifs: 7, accuracyDrifs: 7, element: "NONE" },
    VOODOO: { damageDrifs: 7, accuracyDrifs: 7 },
};

export const defaultSimpleOptions = (profile = "BARBARIAN") => ({
    passiveDamageReduction: false,
    percentageDamageReduction: false,
    damageReductionChance: false,
    dodgeChance: false,
    ...(PROFILE_DEFAULTS[profile] || PROFILE_DEFAULTS.BARBARIAN),
});

export const normalizeSimpleProfile = (value) => {
    const migrations = {
        MAGICAL: "VOODOO",
        MAGICAL_MENTAL: "VOODOO",
        MAGICAL_RANGED: "FIRE_MAGE",
        PHYSICAL_MELEE: "BARBARIAN",
        PHYSICAL_RANGED: "ARCHER",
    };
    const migrated = migrations[value] || value;
    return SIMPLE_PROFILES.some((profile) => profile.value === migrated) ? migrated : "BARBARIAN";
};

export const normalizeSimpleOptions = (value, profile) => {
    const defaults = defaultSimpleOptions(profile);
    if (!value || typeof value !== "object" || Array.isArray(value)) return defaults;
    const number = (candidate, fallback) => {
        const parsed = Math.trunc(Number(candidate));
        return Number.isFinite(parsed) ? Math.max(1, Math.min(12, parsed)) : fallback;
    };
    const style = ["KNIGHT", "DRUID"].includes(profile)
        ? ["OFFENSIVE", "DEFENSIVE"].includes(value.style)
            ? value.style
            : defaults.style
        : undefined;
    const allowedElements =
        profile === "SHEED" ? ["NONE", "FIRE", "FROST", "ENERGY"] : ["FIRE", "FROST", "ENERGY"];
    const element = ["BARBARIAN", "SHEED"].includes(profile)
        ? allowedElements.includes(value.element)
            ? value.element
            : defaults.element
        : undefined;
    return {
        ...defaults,
        damageDrifs: number(value.damageDrifs, defaults.damageDrifs),
        accuracyDrifs: number(value.accuracyDrifs, defaults.accuracyDrifs),
        ...(style ? { style } : {}),
        ...(element ? { element } : {}),
        passiveDamageReduction: Boolean(value.passiveDamageReduction),
        percentageDamageReduction: Boolean(value.percentageDamageReduction),
        damageReductionChance: Boolean(value.damageReductionChance),
        dodgeChance: Boolean(value.dodgeChance),
    };
};

// Retained only so old saved configurations can still be parsed and migrated.
export const DEFAULT_SIMPLE_ASPECTS = {};
export const SIMPLE_ASPECTS = [];
export const SIMPLE_IMPORTANCE = [];
