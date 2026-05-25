const formatStatValue = (val) => {
    if (val === undefined || val === null) return val;

    if (typeof val === 'number') {
        return Number.isInteger(val) ? val : parseFloat(val.toFixed(2));
    }

    if (typeof val === 'string') {
        const hasPercent = val.includes('%');
        const parsed = parseFloat(val.replace(',', '.').replace('%', '').trim());

        if (!isNaN(parsed)) {
            const rounded = parseFloat(parsed.toFixed(2));
            return hasPercent ? `${rounded}%` : rounded;
        }
    }

    return val;
};

const StatsPanel = ({ stats, onCalculate, gameRules }) => {
    const basicStats = [];
    const drifStats = [];
    const orbStats = [];

    if (stats) {
        Object.entries(stats).forEach(([key, rawVal]) => {
            const keyLower = key.toLowerCase();
            if (keyLower.includes("bonus drify") || keyLower.includes("pojemność")) {
                return;
            }

            const val = formatStatValue(rawVal);

            if (gameRules?.drifBasePowers && gameRules.drifBasePowers[key] !== undefined) {
                drifStats.push({ key, val, displayName: gameRules.bonusTranslations?.[key] || key });
            } else if (gameRules?.bonusTranslations && gameRules.bonusTranslations[key]) {
                orbStats.push({ key, val, displayName: gameRules.bonusTranslations[key] });
            } else {
                basicStats.push({ key, val, displayName: key });
            }
        });
    }

    const sortByDisplayName = (a, b) => a.displayName.localeCompare(b.displayName);
    basicStats.sort(sortByDisplayName);
    drifStats.sort(sortByDisplayName);
    orbStats.sort(sortByDisplayName);

    return (
        <div className="bg-gradient-to-b from-stone-900 to-black p-6 border-2 border-stone-800 shadow-[0_0_30px_rgba(0,0,0,0.9)] w-full">

            <h3 className="text-2xl font-serif font-bold border-b-4 border-double border-red-900/70 pb-4 mb-8 text-stone-300 text-center uppercase tracking-[0.3em] drop-shadow-[0_2px_5px_rgba(0,0,0,1)]">
                Podsumowanie Statystyk
            </h3>

            <div className="flex justify-center mb-10">
                <button
                    className="w-full md:w-1/2 py-4 bg-gradient-to-b from-red-900 to-black border border-red-800 hover:from-red-800 hover:to-black hover:border-red-600 text-stone-300 font-serif font-bold text-xl uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(153,27,27,0.4)] hover:shadow-[0_0_25px_rgba(220,38,38,0.5)]"
                    onClick={onCalculate}
                >
                    Przelicz Statystyki
                </button>
            </div>

            {(!stats || Object.keys(stats).length === 0) ? (
                <div className="flex justify-center py-10">
                    <p className="text-stone-500 font-serif text-lg italic border-y border-stone-800 py-3 w-full text-center bg-black/50">
                        Wybierz ekwipunek z bazy, aby poznać swoją potęgę...
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    <div className="bg-stone-950 border border-stone-800 p-4 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] flex flex-col gap-2">
                        <h4 className="text-center text-stone-400 font-serif font-bold uppercase tracking-[0.2em] border-b border-stone-800 pb-2 mb-2 drop-shadow-md">
                            Statystyki podstawowe
                        </h4>
                        {basicStats.length > 0 ? basicStats.map(({ key, val, displayName }) => (
                            <div key={key} className="flex justify-between items-center bg-black/60 border-b border-stone-800 p-2 hover:bg-stone-900/50 transition-colors">
                                <span className="text-stone-400 text-xs font-serif uppercase tracking-wider">{displayName}</span>
                                <span className="text-stone-200 font-bold font-serif">{val}</span>
                            </div>
                        )) : (
                            <p className="text-center font-serif text-xs text-stone-600 italic mt-4">Pustka...</p>
                        )}
                    </div>

                    <div className="bg-stone-950 border border-amber-900/30 p-4 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] flex flex-col gap-2 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-900/10 to-transparent pointer-events-none"></div>
                        <h4 className="text-center text-amber-700 font-serif font-bold uppercase tracking-[0.2em] border-b border-amber-900/40 pb-2 mb-2 drop-shadow-md relative z-10">
                            Drify
                        </h4>
                        {drifStats.length > 0 ? drifStats.map(({ key, val, displayName }) => (
                            <div key={key} className="flex justify-between items-center bg-black/60 border-b border-amber-900/20 p-2 hover:bg-amber-900/10 transition-colors relative z-10">
                                <span className="text-stone-400 text-xs font-serif uppercase tracking-wider">{displayName}</span>
                                <span className="text-amber-600 font-bold font-serif">{val}</span>
                            </div>
                        )) : (
                            <p className="text-center font-serif text-xs text-stone-600 italic mt-4 relative z-10">Brak drifów...</p>
                        )}
                    </div>

                    <div className="bg-stone-950 border border-red-900/30 p-4 shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] flex flex-col gap-2 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-900/10 to-transparent pointer-events-none"></div>
                        <h4 className="text-center text-red-800 font-serif font-bold uppercase tracking-[0.2em] border-b border-red-900/40 pb-2 mb-2 drop-shadow-md relative z-10">
                            Orby
                        </h4>
                        {orbStats.length > 0 ? orbStats.map(({ key, val, displayName }) => (
                            <div key={key} className="flex justify-between items-center bg-black/60 border-b border-red-900/20 p-2 hover:bg-red-900/10 transition-colors relative z-10">
                                <span className="text-stone-400 text-xs font-serif uppercase tracking-wider">{displayName}</span>
                                <span className="text-red-600 font-bold font-serif">{val}</span>
                            </div>
                        )) : (
                            <p className="text-center font-serif text-xs text-stone-600 italic mt-4 relative z-10">Brak orbów...</p>
                        )}
                    </div>

                </div>
            )}
        </div>
    );
};

export default StatsPanel;