const StatsPanel = ({ stats, onCalculate }) => {
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {stats && Object.keys(stats).length > 0 ? (
                    Object.entries(stats).sort().map(([key, val]) => (
                        <div key={key} className="flex justify-between items-center bg-neutral-900/60 border border-neutral-700/50 p-3 rounded-lg shadow-inner">
                            <span className="text-gray-300 text-sm font-medium tracking-wide">{key}</span>
                            <span className="text-yellow-400 font-bold text-lg">{val}</span>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full flex justify-center py-6">
                        <p className="text-gray-500 text-lg italic bg-neutral-900/40 px-6 py-2 rounded-full border border-neutral-700/50">
                            Wybierz sprzęt z bazy i kliknij przelicz...
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StatsPanel;