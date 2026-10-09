import { resolveDrifCategoryKey } from "../../../shared/domain/equipment/drifCategories";

const CHARACTER_STAT_NAMES = new Set([
    "Siła",
    "Zręczność",
    "Moc",
    "Wiedza",
    "PŻ",
    "Mana",
    "Kondycja",
]);

export const DRIF_CATEGORY_CONFIG = {
    OFFENSIVE: { title: "Drify ofensywne", accent: "red" },
    DEFENSIVE: { title: "Drify defensywne", accent: "sky" },
    UTILITY: { title: "Drify użytkowe", accent: "emerald" },
};

const BASIC_CATEGORY_CONFIG = {
    attributes: { title: "Atrybuty", accent: "stone" },
    offense: { title: "Atak", accent: "amber" },
    defense: { title: "Obrona i odporności", accent: "sky" },
    other: { title: "Pozostałe", accent: "stone" },
};
const ORB_CATEGORY_CONFIG = {
    combat: { title: "Orby bojowe", accent: "rose" },
    utility: { title: "Orby użytkowe", accent: "violet" },
};

export const formatStatValue = (value) => {
    if (value === undefined || value === null) return value;
    if (typeof value === "number")
        return Number.isInteger(value) ? value : Number.parseFloat(value.toFixed(2));
    if (typeof value === "string") {
        const parsed = Number.parseFloat(value.replace(",", ".").replace("%", "").trim());
        if (!Number.isNaN(parsed)) {
            const rounded = Number.parseFloat(parsed.toFixed(2));
            return value.includes("%") ? `${rounded}%` : rounded;
        }
    }
    return value;
};

const classifyBasicStat = (name) => {
    if (CHARACTER_STAT_NAMES.has(name)) return "attributes";
    const normalized = name.toLocaleLowerCase("pl-PL");
    if (/pancerz|odporność|obrona|redukc|unik/.test(normalized)) return "defense";
    if (/obraż|atak|traf|kryt/.test(normalized)) return "offense";
    return "other";
};
const classifyOrb = (key) =>
    /DMG_|DEFENSE|DODGE|HIT|ATTACK|CRIT|STEAL|FARID/.test(key) ? "combat" : "utility";
const sortByDisplayName = (left, right) => left.displayName.localeCompare(right.displayName, "pl");

/** Converts a calculation response into presentation-ready statistic columns. */
export const buildStatColumns = ({ stats, gameRules = {}, statSources = {} }) => {
    const groups = { attributes: [], offense: [], defense: [], other: [], combat: [], utility: [] };
    const drifCategories = statSources.drifCategories || {};
    const orbBonusTypes = new Set(statSources.orbBonusTypes || []);
    const resolveDrifCategory = (key) => {
        if (drifCategories[key]) return String(drifCategories[key]).trim().toUpperCase();
        if (orbBonusTypes.has(key)) return null;
        return (
            String(resolveDrifCategoryKey(key, gameRules.drifBonusCategories))
                .trim()
                .toUpperCase() || null
        );
    };
    const toStat = ([key, rawValue]) => ({
        key,
        val: formatStatValue(rawValue),
        displayName: gameRules.bonusTranslations?.[key] || key,
    });

    Object.entries(stats || {}).forEach((entry) => {
        const [key] = entry;
        const lowerKey = key.toLowerCase();
        if (
            lowerKey.includes("bonus drify") ||
            lowerKey.includes("pojemność") ||
            resolveDrifCategory(key)
        )
            return;
        groups[orbBonusTypes.has(key) ? classifyOrb(key) : classifyBasicStat(key)].push(
            toStat(entry)
        );
    });
    Object.values(groups).forEach((group) => group.sort(sortByDisplayName));
    const drifGroups = Object.fromEntries(
        Object.keys(DRIF_CATEGORY_CONFIG).map((category) => [
            category,
            Object.entries(stats || {})
                .filter(([key]) => resolveDrifCategory(key) === category)
                .map(toStat)
                .sort(sortByDisplayName),
        ])
    );

    return [
        {
            title: "Statystyki podstawowe",
            accent: "stone",
            categories: Object.entries(BASIC_CATEGORY_CONFIG).flatMap(([key, category]) =>
                groups[key].length ? [{ category, values: groups[key] }] : []
            ),
        },
        {
            title: "Drify",
            accent: "violet",
            categoryAccents: true,
            categories: Object.entries(DRIF_CATEGORY_CONFIG).flatMap(([key, category]) =>
                drifGroups[key].length ? [{ category, values: drifGroups[key] }] : []
            ),
        },
        {
            title: "Orby",
            accent: "rose",
            categories: Object.entries(ORB_CATEGORY_CONFIG).flatMap(([key, category]) =>
                groups[key].length ? [{ category, values: groups[key] }] : []
            ),
        },
    ].filter((column) => column.categories.length);
};
