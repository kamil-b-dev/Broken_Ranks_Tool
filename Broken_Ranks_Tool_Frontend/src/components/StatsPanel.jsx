const CHARACTER_STAT_NAMES = new Set(["Siła", "Zręczność", "Moc", "Wiedza", "PŻ", "Mana", "Kondycja"]);

const DRIF_CATEGORY_CONFIG = {
    OFFENSIVE: { title: "Drify ofensywne", accent: "amber" },
    DEFENSIVE: { title: "Drify defensywne", accent: "sky" },
    UTILITY: { title: "Drify użytkowe", accent: "violet" }
};

const DRIF_CATEGORY_FALLBACK = {
    CC_PROTECTION: "DEFENSIVE",
    CRITICAL_DAMAGE_CHANCE_REDUCTION: "DEFENSIVE",
    CRITICAL_DAMAGE_REDUCTION: "DEFENSIVE",
    DAMAGE_REDUCTION: "DEFENSIVE",
    DAMAGE_REDUCTION_CHANCE: "DEFENSIVE",
    DEFENSE_MELEE: "DEFENSIVE",
    DEFENSE_MENTAL: "DEFENSIVE",
    DEFENSE_RANGE: "DEFENSIVE",
    DODGE_CHANCE: "DEFENSIVE",
    DOUBLE_DEFENSE_ROLL_CHANCE: "DEFENSIVE",
    PASIVE_DAMAGE_REDUCTION: "DEFENSIVE",
    PERCENTAGE_DAMAGE_REDUCTION: "DEFENSIVE",
    CRITICAL_CHANCE: "OFFENSIVE",
    DAMAGE_ENERGY: "OFFENSIVE",
    DAMAGE_FIRE: "OFFENSIVE",
    DAMAGE_FROST: "OFFENSIVE",
    DAMAGE_MAGIC: "OFFENSIVE",
    DAMAGE_PHYSICAL: "OFFENSIVE",
    DOUBLE_ATTACK_CHANCE: "OFFENSIVE",
    DOUBLE_HIT_ROLL_CHANCE: "OFFENSIVE",
    HIT_CHANCE_MELEE: "OFFENSIVE",
    HIT_CHANCE_MENTAL: "OFFENSIVE",
    HIT_CHANCE_RANGED: "OFFENSIVE",
    MENTAL_DEFENSE_REDUCTION: "OFFENSIVE",
    DISPELL_CHANCE: "UTILITY",
    MANA_REGEN: "UTILITY",
    MANA_STEAL: "UTILITY",
    MANA_USAGE_REDUCTION: "UTILITY",
    STAMINA_REGEN: "UTILITY",
    STAMINA_USAGE_REDUCTION: "UTILITY"
};

const BASIC_CATEGORY_CONFIG = {
    attributes: { title: "Atrybuty", accent: "stone" },
    offense: { title: "Atak", accent: "amber" },
    defense: { title: "Obrona i odporności", accent: "sky" },
    other: { title: "Pozostałe", accent: "stone" }
};

const ORB_CATEGORY_CONFIG = {
    combat: { title: "Orby bojowe", accent: "rose" },
    utility: { title: "Orby użytkowe", accent: "violet" }
};

const ACCENT_CLASSES = {
    stone: {
        card: "border-stone-800",
        heading: "text-stone-300 border-stone-800",
        row: "border-stone-800 hover:bg-stone-900/50",
        value: "text-stone-100"
    },
    amber: {
        card: "border-amber-900/40",
        heading: "text-amber-500 border-amber-900/40",
        row: "border-amber-900/20 hover:bg-amber-900/10",
        value: "text-amber-400"
    },
    sky: {
        card: "border-sky-900/45",
        heading: "text-sky-400 border-sky-900/45",
        row: "border-sky-900/25 hover:bg-sky-950/25",
        value: "text-sky-300"
    },
    rose: {
        card: "border-rose-900/45",
        heading: "text-rose-400 border-rose-900/45",
        row: "border-rose-900/25 hover:bg-rose-950/25",
        value: "text-rose-300"
    },
    violet: {
        card: "border-violet-900/45",
        heading: "text-violet-400 border-violet-900/45",
        row: "border-violet-900/25 hover:bg-violet-950/25",
        value: "text-violet-300"
    }
};

/** Formats a raw statistic value for display, including percentage values. */
const formatStatValue = (val) => {
    if (val === undefined || val === null) return val;

    if (typeof val === "number") {
        return Number.isInteger(val) ? val : parseFloat(val.toFixed(2));
    }

    if (typeof val === "string") {
        const hasPercent = val.includes("%");
        const parsed = parseFloat(val.replace(",", ".").replace("%", "").trim());

        if (!Number.isNaN(parsed)) {
            const rounded = parseFloat(parsed.toFixed(2));
            return hasPercent ? `${rounded}%` : rounded;
        }
    }

    return val;
};

const classifyBasicStat = (name) => {
    if (CHARACTER_STAT_NAMES.has(name)) return "attributes";

    const normalizedName = name.toLocaleLowerCase("pl-PL");
    if (/pancerz|odporność|obrona|redukc|unik/.test(normalizedName)) return "defense";
    if (/obraż|atak|traf|kryt/.test(normalizedName)) return "offense";
    return "other";
};

const classifyOrb = (key) => (
    /DMG_|DEFENSE|DODGE|HIT|ATTACK|CRIT|STEAL|FARID/.test(key) ? "combat" : "utility"
);

const sortByDisplayName = (left, right) => left.displayName.localeCompare(right.displayName, "pl");

/** Renders a compact category of calculated statistics. */
const StatCategoryCard = ({ category, values, accent }) => {
    const styles = ACCENT_CLASSES[accent || category.accent];

    return (
        <section className={`bg-stone-950/90 border p-4 shadow-[inset_0_0_25px_rgba(0,0,0,0.65)] ${styles.card}`}>
            <div className={`flex items-center justify-between border-b pb-2 mb-2 ${styles.heading}`}>
                <h4 className="font-serif font-bold uppercase tracking-[0.16em] text-xs">{category.title}</h4>
            </div>
            <div className="flex flex-col gap-1">
                {values.map(({ key, val, displayName }) => (
                    <div key={key} className={`flex justify-between gap-3 items-center border-b p-2 transition-colors ${styles.row}`}>
                        <span className="min-w-0 text-stone-400 text-xs font-serif uppercase tracking-wide">{displayName}</span>
                        <span className={`shrink-0 font-bold font-serif ${styles.value}`}>{val}</span>
                    </div>
                ))}
            </div>
        </section>
    );
};

/** Renders one of the three main statistic columns. */
const StatSummaryColumn = ({ title, accent, categories }) => {
    const styles = ACCENT_CLASSES[accent];

    return (
        <section className={`bg-stone-950/75 border p-4 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] ${styles.card}`}>
            <div className={`flex items-center justify-between border-b pb-3 mb-3 ${styles.heading}`}>
                <h4 className="font-serif font-bold uppercase tracking-[0.18em] text-sm">{title}</h4>
            </div>
            <div className="space-y-3">
                {categories.map(({ category, values }) => (
                    <StatCategoryCard key={category.title} category={category} values={values} accent={accent} />
                ))}
            </div>
        </section>
    );
};

/**
 * Displays calculated statistics grouped by their purpose and source.
 * @param {object} props Component properties.
 * @param {object|null} props.stats Calculated statistics to display.
 * @param {Function} props.onCalculate Callback for recalculating statistics.
 * @param {object} props.gameRules Rules providing localized bonus names.
 * @param {object} props.statSources Exact bonus sources returned with the calculation result.
 * @returns {JSX.Element} The statistics panel.
 */
const StatsPanel = ({ stats, onCalculate, gameRules, statSources = {} }) => {
    const groups = {
        attributes: [], offense: [], defense: [], other: [],
        OFFENSIVE: [], DEFENSIVE: [], UTILITY: [],
        combat: [], utility: []
    };
    const drifCategories = statSources.drifCategories || {};
    const orbBonusTypes = new Set(statSources.orbBonusTypes || []);
    const resolveDrifCategory = (key) => {
        const exactCategory = drifCategories[key];
        if (exactCategory) return String(exactCategory).trim().toUpperCase();

        if (orbBonusTypes.has(key)) return null;
        return String(gameRules?.drifBonusCategories?.[key] || DRIF_CATEGORY_FALLBACK[key] || "")
            .trim()
            .toUpperCase() || null;
    };

    if (stats) {
        Object.entries(stats).forEach(([key, rawVal]) => {
            const keyLower = key.toLowerCase();
            if (keyLower.includes("bonus drify") || keyLower.includes("pojemność")) return;

            const stat = {
                key,
                val: formatStatValue(rawVal),
                displayName: gameRules?.bonusTranslations?.[key] || key
            };

            if (resolveDrifCategory(key)) {
                return;
            } else if (orbBonusTypes.has(key)) {
                groups[classifyOrb(key)].push(stat);
            } else {
                groups[classifyBasicStat(key)].push(stat);
            }
        });
    }

    Object.values(groups).forEach(group => group.sort(sortByDisplayName));
    const drifStatsByCategory = Object.entries(DRIF_CATEGORY_CONFIG).reduce((result, [categoryKey]) => {
        result[categoryKey] = Object.entries(stats || {})
            .filter(([key]) => resolveDrifCategory(key) === categoryKey)
            .map(([key, rawVal]) => ({
                key,
                val: formatStatValue(rawVal),
                displayName: gameRules?.bonusTranslations?.[key] || key
            }))
            .sort(sortByDisplayName);
        return result;
    }, {});
    const statColumns = [
        {
            title: "Statystyki podstawowe",
            accent: "stone",
            categories: Object.entries(BASIC_CATEGORY_CONFIG)
                .flatMap(([key, category]) => groups[key].length > 0 ? [{ category, values: groups[key] }] : [])
        },
        {
            title: "Drify",
            accent: "amber",
            categories: Object.entries(DRIF_CATEGORY_CONFIG)
                .flatMap(([key, category]) => drifStatsByCategory[key].length > 0 ? [{ category, values: drifStatsByCategory[key] }] : [])
        },
        {
            title: "Orby",
            accent: "rose",
            categories: Object.entries(ORB_CATEGORY_CONFIG)
                .flatMap(([key, category]) => groups[key].length > 0 ? [{ category, values: groups[key] }] : [])
        }
    ].filter(column => column.categories.length > 0);

    return (
        <section className="bg-gradient-to-b from-stone-900 to-black p-5 md:p-6 border border-stone-700/70 shadow-[0_0_30px_rgba(0,0,0,0.75)] w-full">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b-4 border-double border-red-900/70 pb-4 mb-6">
                <div>
                    <p className="section-kicker">Wynik konfiguracji</p>
                    <h3 className="text-xl md:text-2xl font-serif font-bold text-stone-200 uppercase tracking-[0.18em] drop-shadow-[0_2px_5px_rgba(0,0,0,1)]">
                        Podsumowanie statystyk
                    </h3>
                </div>
                <button
                    className="w-full md:w-auto px-6 py-3 bg-gradient-to-b from-red-900 to-black border border-red-800 hover:from-red-800 hover:border-red-600 text-stone-200 font-serif font-bold text-sm uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(153,27,27,0.35)] hover:shadow-[0_0_25px_rgba(220,38,38,0.45)]"
                    onClick={onCalculate}
                >
                    Przelicz statystyki
                </button>
            </div>

            {statColumns.length === 0 ? (
                <div className="flex justify-center py-8">
                    <p className="text-stone-500 font-serif text-base italic border-y border-stone-800 py-3 w-full text-center bg-black/50">
                        Wybierz ekwipunek
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {statColumns.map(({ title, accent, categories }) => (
                        <StatSummaryColumn key={title} title={title} accent={accent} categories={categories} />
                    ))}
                </div>
            )}
        </section>
    );
};

export default StatsPanel;
