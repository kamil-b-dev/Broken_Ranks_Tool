/**
 * Reserves a horizontal workspace for options that alter the optimizer strategy.
 * @returns {JSX.Element} Global optimizer settings panel.
 */
const OptimizerSettingsPanel = ({ settings, onChange }) => (
    <section className="w-full shrink-0 border border-purple-900/80 bg-gradient-to-r from-black via-purple-950/25 to-black px-4 py-3 shadow-[inset_0_0_24px_rgba(55,20,90,0.28)]">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-5">
            <div className="shrink-0 sm:border-r sm:border-stone-800 sm:pr-5">
                <h3 className="text-xs text-stone-300 font-serif font-bold uppercase tracking-widest">
                    Ustawienia optymalizatora
                </h3>
            </div>
            <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                    type="checkbox"
                    checked={settings.forceMaximizationByDrifBonus}
                    onChange={event => onChange({
                        ...settings,
                        forceMaximizationByDrifBonus: event.target.checked
                    })}
                    className="h-4 w-4 accent-purple-700"
                />
                <span className="text-[11px] text-stone-400 leading-relaxed">
                    Wymuś maksymalizację według bonusów do drifów
                </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                    type="checkbox"
                    checked={settings.generateVariants}
                    onChange={event => onChange({
                        ...settings,
                        generateVariants: event.target.checked
                    })}
                    className="h-4 w-4 accent-purple-700"
                />
                <span className="text-[11px] text-stone-400 leading-relaxed">
                    Obliczaj dodatkowe warianty
                </span>
            </label>
            <label className={`flex items-center gap-3 select-none ${settings.generateVariants ? '' : 'cursor-not-allowed opacity-45'}`}>
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
                    onChange={event => onChange({
                        ...settings,
                        maxVariantLossPercent: Number(event.target.value)
                    })}
                    aria-label="Maksymalna dopuszczalna strata wariantu w procentach"
                    className="w-20 border border-purple-900/80 bg-black px-2 py-1 text-center text-xs text-stone-200 outline-none focus:border-purple-500 disabled:cursor-not-allowed"
                />
                <span className="text-[11px] text-stone-400">%</span>
            </label>
        </div>
    </section>
);

export default OptimizerSettingsPanel;
