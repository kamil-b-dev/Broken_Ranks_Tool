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
            const val = formatStatValue(rawVal);

            if (gameRules?.drifBasePowers && gameRules.drifBasePowers[key] !== undefined) {
                drifStats.push({
                    key,
                    val,
                    displayName: gameRules.bonusTranslations?.[key] || key
                });
            } else if (gameRules?.bonusTranslations && gameRules.bonusTranslations[key]) {
                orbStats.push({
                    key,
                    val,
                    displayName: gameRules.bonusTranslations[key]
                });
            } else {
                basicStats.push({
                    key,
                    val,
                    displayName: key
                });
            }
        });
    }

    const sortByDisplayName = (a, b) => a.displayName.localeCompare(b.displayName);
    basicStats.sort(sortByDisplayName);
    drifStats.sort(sortByDisplayName);
    orbStats.sort(sortByDisplayName);

    return (
        <div className="bg-neutral-800 p-6 rounded-xl shadow-lg border border-neutral-700 w-full">
            <h3 className="text-2xl font-bold border-b-2 border-orange-600 pb-3 mb-6 text-white text-center uppercase tracking-widest">
                Wynik Statystyk
            </h3>

            <div className="flex justify-center mb-8">
                <button
                    className="w-full md:w-1/2 py-4 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg text-xl transition-all shadow-[0_0_15px_rgba(234,88,12,0.4)] hover:shadow-[0_0_25px_rgba(234,88,12,0.6)]"
                    onClick={onCalculate}
                >
                    PRZELICZ STATYSTYKI
                </button>
            </div>

            {(!stats || Object.keys(stats).length === 0) ? (
                <div className="flex justify-center py-6">
                    <p className="text-gray-500 text-lg italic bg-neutral-900/40 px-6 py-2 rounded-full border border-neutral-700/50">
                        Wybierz sprzęt z bazy i kliknij przelicz...
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-neutral-900/40 p-4 rounded-xl border border-blue-900/50 shadow-inner flex flex-col gap-3">
                        <h4 className="text-center text-blue-400 font-bold uppercase tracking-widest border-b border-blue-900/50 pb-2 mb-1">
                            Podstawowe
                        </h4>
                        {basicStats.length > 0 ? basicStats.map(({ key, val, displayName }) => (
                            <div key={key} className="flex justify-between items-center bg-neutral-800/80 border border-blue-900/30 p-2.5 rounded-lg shadow-sm hover:border-blue-700/50 transition-colors">
                                <span className="text-gray-300 text-sm font-medium tracking-wide">{displayName}</span>
                                <span className="text-blue-300 font-bold text-base">{val}</span>
                            </div>
                        )) : (
                            <p className="text-center text-xs text-gray-600 italic mt-4">Brak statystyk bazowych</p>
                        )}
                    </div>

                    <div className="bg-neutral-900/40 p-4 rounded-xl border border-orange-900/50 shadow-inner flex flex-col gap-3">
                        <h4 className="text-center text-orange-400 font-bold uppercase tracking-widest border-b border-orange-900/50 pb-2 mb-1">
                            Drify
                        </h4>
                        {drifStats.length > 0 ? drifStats.map(({ key, val, displayName }) => (
                            <div key={key} className="flex justify-between items-center bg-neutral-800/80 border border-orange-900/30 p-2.5 rounded-lg shadow-sm hover:border-orange-700/50 transition-colors">
                                <span className="text-gray-300 text-sm font-medium tracking-wide">{displayName}</span>
                                <span className="text-yellow-400 font-bold text-base">{val}</span>
                            </div>
                        )) : (
                            <p className="text-center text-xs text-gray-600 italic mt-4">Brak modyfikatorów drifów</p>
                        )}
                    </div>

                    <div className="bg-neutral-900/40 p-4 rounded-xl border border-red-900/50 shadow-inner flex flex-col gap-3">
                        <h4 className="text-center text-red-400 font-bold uppercase tracking-widest border-b border-red-900/50 pb-2 mb-1">
                            Orby
                        </h4>
                        {orbStats.length > 0 ? orbStats.map(({ key, val, displayName }) => (
                            <div key={key} className="flex justify-between items-center bg-neutral-800/80 border border-red-900/30 p-2.5 rounded-lg shadow-sm hover:border-red-700/50 transition-colors">
                                <span className="text-gray-300 text-sm font-medium tracking-wide">{displayName}</span>
                                <span className="text-red-300 font-bold text-base">{val}</span>
                            </div>
                        )) : (
                            <p className="text-center text-xs text-gray-600 italic mt-4">Brak modyfikatorów orbów</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StatsPanel;