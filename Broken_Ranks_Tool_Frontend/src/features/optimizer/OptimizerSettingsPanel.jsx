const MODES = [
    ["BUILD_FROM_SCRATCH", "Od zera"],
    ["ADVISOR", "Doradca"],
];

/** Switches between the optimizer and advisor workspaces. */
export const OptimizerModeNavigation = ({ settings, onChange }) => (
    <nav className="optimizer-mode-navigation" aria-label="Tryb optymalizatora">
        {MODES.map(([value, label]) => (
            <button
                key={value}
                type="button"
                className="optimizer-mode-window"
                aria-current={settings.mode === value ? "page" : undefined}
                onClick={() => onChange({ ...settings, mode: value })}
            >
                <strong>{label}</strong>
            </button>
        ))}
    </nav>
);

const VariantsOptions = ({ settings, onChange, label }) => (
    <>
        <label className="optimizer-settings-choice flex items-center gap-3 cursor-pointer select-none">
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
                className="w-16 border border-purple-900/80 optimizer-accent-frame bg-black px-2 py-1 text-center text-xs text-stone-200 outline-hidden focus:border-purple-500 optimizer-accent-active disabled:cursor-not-allowed"
            />
            <span className="text-[11px] text-stone-400">%</span>
        </label>
    </>
);

/** Shows only settings meaningful for the currently selected workspace. */
const OptimizerSettingsPanel = ({ settings, onChange }) => {
    const advisory = settings.mode === "ADVISOR";
    const configurationMode = settings.configurationMode || "ADVANCED";
    return (
        <section className="optimizer-settings-strip">
            <h3>Ustawienia</h3>
            <div className="optimizer-settings-options">
                {advisory && (
                    <label className="flex items-center gap-3 text-[11px] text-stone-400">
                        Profil buildu
                        <select
                            className="border border-purple-900/80 optimizer-accent-frame bg-black px-2 py-1 text-stone-200"
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
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="optimizer-settings-mode flex border border-purple-900/80 optimizer-accent-frame bg-black p-0.5">
                            {[
                                ["SIMPLE", "Prosty"],
                                ["ADVANCED", "Zaawansowany"],
                            ].map(([value, label]) => (
                                <button
                                    key={value}
                                    type="button"
                                    aria-pressed={configurationMode === value}
                                    onClick={() =>
                                        onChange({ ...settings, configurationMode: value })
                                    }
                                    className={`px-3 py-1 text-[10px] uppercase tracking-wider ${configurationMode === value ? "bg-purple-900 optimizer-accent-surface text-purple-100 optimizer-accent-text" : "text-stone-400"}`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {!advisory && configurationMode === "ADVANCED" && (
                    <label className="optimizer-settings-choice flex items-center gap-3 cursor-pointer select-none">
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
                {!advisory && configurationMode === "ADVANCED" && (
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
