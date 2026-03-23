const StatsPanel = ({ stats, onCalculate }) => {
    return (
        <div className="bg-neutral-800 p-6 rounded-xl shadow-lg border border-neutral-700 shrink-0">
            <h3 className="text-2xl font-bold border-b-2 border-orange-600 pb-3 mb-4 text-white">
                Statystyki
            </h3>

            <button
                className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg text-lg transition-colors mb-6 shadow-md"
                onClick={onCalculate}
            >
                PRZELICZ STATYSTYKI
            </button>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {stats ? Object.entries(stats).sort().map(([key, val]) => (
                    <div key={key} className="flex justify-between border-b border-neutral-700 pb-2">
                        <span className="text-gray-300">{key}</span>
                        <span className="text-yellow-400 font-bold">{val}</span>
                    </div>
                )) : <p className="text-center text-gray-500">Wybierz sprzęt i kliknij przelicz...</p>}
            </div>
        </div>
    );
};

export default StatsPanel;