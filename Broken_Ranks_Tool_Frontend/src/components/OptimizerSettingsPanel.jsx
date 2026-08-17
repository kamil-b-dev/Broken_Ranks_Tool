/**
 * Reserves a horizontal workspace for options that alter the optimizer strategy.
 * @returns {JSX.Element} Global optimizer settings panel.
 */
const OptimizerSettingsPanel = ({ settings, onChange }) => (
    <section className="w-full shrink-0 border border-red-950/80 bg-gradient-to-r from-black via-red-950/15 to-black px-4 py-3 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]">
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
                    className="h-4 w-4 accent-red-800"
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
                    className="h-4 w-4 accent-red-800"
                />
                <span className="text-[11px] text-stone-400 leading-relaxed">
                    Obliczaj dodatkowe warianty
                </span>
            </label>
        </div>
    </section>
);

export default OptimizerSettingsPanel;
