const MODES = [
    ["BUILD_FROM_SCRATCH", "Od zera", "Nowy układ z pełnego katalogu drifów."],
    ["ADVISOR", "Doradca", "Plan zakupów i zamian dla obecnego buildu."],
];

/** Switches between the optimizer and advisor workspaces. */
export const OptimizerModeNavigation = ({ settings, onChange }) => (
    <nav className="optimizer-mode-navigation" aria-label="Tryb optymalizatora">
        {MODES.map(([value, label, description]) => (
            <button
                key={value}
                type="button"
                className="optimizer-mode-window"
                aria-current={settings.mode === value ? "page" : undefined}
                onClick={() => onChange({ ...settings, mode: value })}
            >
                <strong>{label}</strong>
                <small>{description}</small>
            </button>
        ))}
    </nav>
);

const VariantsOptions = ({ settings, onChange, label }) => (
    <>
        <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
                type="checkbox"
                checked={settings.generateVariants}
                onChange={(event) =>
                    onChange({ ...settings, generateVariants: event.target.checked })
                }
                className="h-4 w-4 accent-purple-700"
            />
            <span className="text-[11px] text-stone-400 leading-relaxed">{label}</span>
        </label>
        <label
            className={`optimizer-settings-loss flex items-center gap-3 select-none ${settings.generateVariants ? "" : "cursor-not-allowed opacity-45"}`}
        >
            <span className="text-[11px] text-stone-400 leading-relaxed whitespace-nowrap">
                Maksymalna strata:
            </span>
            <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={settings.maxVariantLossPercent}
                disabled={!settings.generateVariants}
                onChange={(event) =>
                    onChange({
                        ...settings,
                        maxVariantLossPercent: Number(event.target.value),
                    })
                }
                aria-label="Maksymalna dopuszczalna strata wariantu w procentach"
                className="w-16 border border-purple-900/80 bg-black px-2 py-1 text-center text-xs text-stone-200 outline-none focus:border-purple-500 disabled:cursor-not-allowed"
            />
            <span className="text-[11px] text-stone-400">%</span>
        </label>
    </>
);

/** Shows only settings meaningful for the currently selected workspace. */
const OptimizerSettingsPanel = ({ settings, onChange }) => {
    const advisory = settings.mode === "ADVISOR";
    return (
        <section className="optimizer-settings-strip">
            <h3>{advisory ? "Zakres rekomendacji" : "Ustawienia budowania"}</h3>
            <div className="optimizer-settings-options">
                {advisory && (
                    <label className="flex items-center gap-3 text-[11px] text-stone-400">
                        Profil buildu
                        <select
                            className="border border-purple-900/80 bg-black px-2 py-1 text-stone-200"
                            value={settings.advisorProfession || "AUTO"}
                            onChange={(event) =>
                                onChange({ ...settings, advisorProfession: event.target.value })
                            }
                        >
                            <option value="AUTO">Automatyczny</option>
                            <option value="MAGICAL">Magiczny (Moc/Wiedza)</option>
                            <option value="PHYSICAL">Fizyczny (Siła/Zręczność)</option>
                        </select>
                    </label>
                )}
                {!advisory && (
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={settings.forceMaximizationByDrifBonus}
                            onChange={(event) =>
                                onChange({
                                    ...settings,
                                    forceMaximizationByDrifBonus: event.target.checked,
                                })
                            }
                            className="h-4 w-4 accent-purple-700"
                        />
                        <span className="text-[11px] text-stone-400 leading-relaxed">
                            Wymuś maksymalizację według bonusów do drifów
                        </span>
                    </label>
                )}
                {!advisory && (
                    <VariantsOptions
                        settings={settings}
                        onChange={onChange}
                        label={
                            advisory
                                ? "Pokaż alternatywne rekomendacje"
                                : "Obliczaj dodatkowe warianty"
                        }
                    />
                )}
            </div>
        </section>
    );
};

export default OptimizerSettingsPanel;
