import {
    defaultSimpleOptions,
    changeSimpleStyle,
    normalizeSimpleOptions,
    SIMPLE_ELEMENTS,
    SIMPLE_PROFILES,
    SIMPLE_STYLES,
} from "./simpleProfileDefinitions";

const QuantityField = ({ label, value, onChange }) => (
    <label className="simple-profile-field flex items-center justify-between gap-4 border border-purple-950/80 bg-black/25 p-3 text-xs text-stone-300">
        <span>{label}</span>
        <input
            type="number"
            min="1"
            max="12"
            value={value}
            onChange={(event) => onChange(Math.max(1, Math.min(12, Number(event.target.value))))}
            className="w-16 border border-purple-900/80 bg-black px-2 py-1 text-center text-stone-100"
        />
    </label>
);

const Toggle = ({ label, checked, onChange }) => (
    <label className="simple-profile-toggle flex cursor-pointer items-center gap-2 border border-stone-800 bg-black/25 p-3 text-xs text-stone-300">
        <input
            type="checkbox"
            checked={checked}
            onChange={(event) => onChange(event.target.checked)}
            className="h-4 w-4 accent-purple-700"
        />
        {label}
    </label>
);

/** Exposes only the few decisions not predetermined by the selected profession. */
const SimpleProfileGoalsPanel = ({ settings, onChange }) => {
    const profile = settings.simpleProfile || "BARBARIAN";
    const options = normalizeSimpleOptions(settings.simpleOptions, profile);
    const update = (key, value) =>
        onChange({ ...settings, simpleOptions: { ...options, [key]: value } });
    const styled = ["KNIGHT", "DRUID"].includes(profile);
    const elemental = ["BARBARIAN", "SHEED"].includes(profile);
    const archerLike = ["ARCHER", "SHEED", "VOODOO"].includes(profile);

    return (
        <div className="simple-profile-panel min-h-0 flex-1 overflow-y-auto p-3 custom-scrollbar">
            <div className="simple-profile-header mb-3 flex flex-wrap items-center justify-between gap-3 border border-purple-950/80 bg-black/30 p-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-200">
                    Konfiguracja profilu profesji
                </h4>
                <label className="flex items-center gap-3 text-xs text-stone-300">
                    Profil profesji
                    <select
                        aria-label="Profil prostego optymalizatora"
                        value={profile}
                        onChange={(event) =>
                            onChange({
                                ...settings,
                                simpleProfile: event.target.value,
                                simpleOptions: defaultSimpleOptions(event.target.value),
                            })
                        }
                        className="min-w-44 border border-purple-900/80 bg-black px-2 py-1 text-stone-100"
                    >
                        {SIMPLE_PROFILES.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            {styled && (
                <label className="simple-profile-field mb-3 flex items-center justify-between border border-purple-950/80 bg-black/25 p-3 text-xs text-stone-300">
                    Styl buildu
                    <select
                        aria-label="Styl buildu"
                        value={options.style || "OFFENSIVE"}
                        onChange={(event) =>
                            onChange({
                                ...settings,
                                simpleOptions: changeSimpleStyle(
                                    options,
                                    profile,
                                    event.target.value
                                ),
                            })
                        }
                        className="border border-purple-900/80 bg-black px-2 py-1 text-stone-100"
                    >
                        {SIMPLE_STYLES.map((style) => (
                            <option key={style.value} value={style.value}>
                                {style.label}
                            </option>
                        ))}
                    </select>
                </label>
            )}

            <div className="grid gap-2 md:grid-cols-2">
                <QuantityField
                    label="Drify obrażeń"
                    value={options.damageDrifs || 7}
                    onChange={(value) => update("damageDrifs", value)}
                />
                <QuantityField
                    label="Drify celności"
                    value={options.accuracyDrifs || 6}
                    onChange={(value) => update("accuracyDrifs", value)}
                />
            </div>

            {elemental && (
                <label className="simple-profile-field mt-2 flex items-center justify-between border border-purple-950/80 bg-black/25 p-3 text-xs text-stone-300">
                    Drif żywiołowy w broni
                    <select
                        aria-label="Żywioł broni"
                        value={options.element || (profile === "SHEED" ? "NONE" : "FIRE")}
                        onChange={(event) => update("element", event.target.value)}
                        className="border border-purple-900/80 bg-black px-2 py-1 text-stone-100"
                    >
                        {SIMPLE_ELEMENTS.filter(
                            (element) => profile === "SHEED" || element.value !== "NONE"
                        ).map((element) => (
                            <option key={element.value} value={element.value}>
                                {element.label}
                            </option>
                        ))}
                    </select>
                </label>
            )}

            <div className="mt-3 grid gap-2 md:grid-cols-2">
                <Toggle
                    label="Redukcja obrażeń biernych"
                    checked={Boolean(options.passiveDamageReduction)}
                    onChange={(value) => update("passiveDamageReduction", value)}
                />
                <Toggle
                    label="Redukcja obrażeń procentowych"
                    checked={Boolean(options.percentageDamageReduction)}
                    onChange={(value) => update("percentageDamageReduction", value)}
                />
                {archerLike && (
                    <>
                        <Toggle
                            label="Holm — szansa redukcji obrażeń"
                            checked={Boolean(options.damageReductionChance)}
                            onChange={(value) => update("damageReductionChance", value)}
                        />
                        <Toggle
                            label="Farid — szansa uniku"
                            checked={Boolean(options.dodgeChance)}
                            onChange={(value) => update("dodgeChance", value)}
                        />
                    </>
                )}
            </div>
        </div>
    );
};

export default SimpleProfileGoalsPanel;
