import React, { useState, useEffect } from 'react';
import { useEquipment } from '../context/EquipmentContext';

/**
 * Komponent panelu optymalizatora drifów.
 * Umożliwia użytkownikowi wybór modyfikatorów, przypisanie im wagi (1-30)
 * oraz ustawienie twardych limitów ilościowych (min/max).
 *
 * @returns {JSX.Element} Wyrenderowany panel optymalizatora
 */
const OptimizerPanel = () => {
    const { gameRules, runDrifOptimization } = useEquipment();

    const [availableBonuses, setAvailableBonuses] = useState([]);
    const [prioritizedBonuses, setPrioritizedBonuses] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isOptimizing, setIsOptimizing] = useState(false);

    useEffect(() => {
        if (gameRules?.bonusTranslations) {
            const allBonuses = Object.entries(gameRules.bonusTranslations)
                .map(([key, value]) => ({ key, value }))
                .filter(b => gameRules.drifBasePowers[b.key] !== undefined);
            setAvailableBonuses(allBonuses);
        }
    }, [gameRules]);

    const filteredAvailableBonuses = availableBonuses.filter(b =>
        b.value.toLowerCase().includes(searchQuery.toLowerCase())
    );

    /**
     * Przenosi wybrany bonus z listy dostępnych do listy priorytetów
     * i ustawia jego domyślne wartości wagi oraz limitów.
     *
     * @param {Object} bonus Obiekt reprezentujący wybrany bonus
     */
    const handleSelectBonus = (bonus) => {
        setPrioritizedBonuses(prev => [...prev, { ...bonus, weight: 15, min: 0, max: 99 }]);
        setAvailableBonuses(prev => prev.filter(b => b.key !== bonus.key));
    };

    /**
     * Usuwa wybrany bonus z listy priorytetów i przywraca go
     * na listę dostępnych bonusów w zachowanym porządku alfabetycznym.
     *
     * @param {Object} bonus Obiekt reprezentujący usuwany z priorytetów bonus
     */
    const handleRemoveBonus = (bonus) => {
        setAvailableBonuses(prev => [...prev, { key: bonus.key, value: bonus.value }].sort((a, b) => a.value.localeCompare(b.value)));
        setPrioritizedBonuses(prev => prev.filter(b => b.key !== bonus.key));
    };

    /**
     * Czyści całą listę priorytetów, przywracając wszystkie bonusy
     * z powrotem na listę dostępnych.
     */
    const handleClearAll = () => {
        setAvailableBonuses(prev => {
            const combined = [...prev, ...prioritizedBonuses.map(b => ({ key: b.key, value: b.value }))];
            return combined.sort((a, b) => a.value.localeCompare(b.value));
        });
        setPrioritizedBonuses([]);
    };

    /**
     * Aktualizuje konkretną właściwość modyfikatora na liście priorytetów.
     *
     * @param {string} key Klucz identyfikujący modyfikator
     * @param {string} field Nazwa pola do aktualizacji ('weight', 'min', 'max')
     * @param {string|number} value Nowa wartość pola
     */
    const handleUpdateBonus = (key, field, value) => {
        setPrioritizedBonuses(prev => prev.map(b => {
            if (b.key === key) {
                return { ...b, [field]: value };
            }
            return b;
        }));
    };

    /**
     * Buduje strukturę żądania na podstawie ustawionych priorytetów i limitów,
     * a następnie uruchamia proces optymalizacji na backendzie.
     *
     * @returns {Promise<void>}
     */
    const handleOptimizeClick = async () => {
        if (prioritizedBonuses.length === 0) return;
        setIsOptimizing(true);

        const priorities = {};
        const targetQuantities = {};

        prioritizedBonuses.forEach(b => {
            priorities[b.key] = parseInt(b.weight, 10);
            if (b.min > 0 || b.max < 99) {
                targetQuantities[b.key] = {
                    min: parseInt(b.min, 10),
                    max: parseInt(b.max, 10)
                };
            }
        });

        await runDrifOptimization({ priorities, targetQuantities });
        setIsOptimizing(false);
    };

    return (
        <div className="bg-gradient-to-b from-stone-900 to-black p-5 border-2 border-stone-800 shadow-[0_0_30px_rgba(0,0,0,0.9)] flex flex-col h-full relative">
            <div className="flex justify-between items-end border-b-4 border-double border-purple-900/70 pb-3 mb-4 shrink-0">
                <h3 className="text-xl font-serif font-bold text-stone-200 uppercase tracking-widest drop-shadow-[0_2px_5px_rgba(0,0,0,1)]">
                    Optymalizator Drifów
                </h3>
            </div>

            <div className="grid grid-cols-[1fr_1.3fr] gap-4 xl:gap-6 flex-1 min-h-0">
                <div className="flex flex-col gap-2 h-full min-h-0">
                    <div className="flex items-center justify-center border-b border-stone-700 pb-2 mb-2 min-h-[34px]">
                        <h4 className="text-stone-300 font-serif font-bold uppercase tracking-widest text-xs">
                            Dostępne Bonusy
                        </h4>
                    </div>

                    <div className="mb-2 shrink-0">
                        <input
                            type="text"
                            placeholder="Szukaj statystyki..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-stone-950/80 border border-stone-700 focus:border-purple-600 rounded-sm p-2 text-xs text-stone-200 font-serif outline-none transition-colors shadow-inner placeholder-stone-600"
                        />
                    </div>

                    <div className="overflow-y-auto pr-2 flex-1 min-h-0 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-stone-800 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-purple-800/70">
                        {filteredAvailableBonuses.length === 0 ? (
                            <p className="text-center text-stone-600 italic mt-4 text-xs font-serif">Brak wyników...</p>
                        ) : (
                            filteredAvailableBonuses.map(bonus => (
                                <div key={bonus.key} onClick={() => handleSelectBonus(bonus)}
                                     className="flex justify-between items-center bg-black/40 p-2 border-b border-stone-800 hover:bg-stone-800/80 hover:border-purple-900/50 cursor-pointer transition-all group mb-[1px]">
                                    <span className="text-stone-400 group-hover:text-stone-200 text-xs font-serif transition-colors">{bonus.value}</span>
                                    <span className="text-stone-600 group-hover:text-purple-400 font-bold text-lg leading-none transition-colors shrink-0">+</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-2 h-full min-h-0">
                    <div className="flex items-center justify-between border-b border-stone-700 pb-2 mb-2 min-h-[34px]">
                        <h4 className="text-stone-300 font-serif font-bold uppercase tracking-widest text-xs">
                            Priorytety i Limity
                        </h4>
                        {prioritizedBonuses.length > 0 && (
                            <button
                                onClick={handleClearAll}
                                className="text-[10px] bg-red-950/60 hover:bg-red-900 text-red-400 hover:text-red-100 border border-red-900/50 px-2 py-1 rounded-sm transition-all uppercase tracking-wider font-serif shrink-0"
                            >
                                Wyczyść
                            </button>
                        )}
                    </div>

                    <div className="overflow-y-auto pr-2 flex-1 min-h-0 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-stone-800 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-purple-800/70">
                        {prioritizedBonuses.length === 0 ? (
                            <p className="text-center text-stone-600 italic mt-10 text-xs font-serif">Wybierz bonusy z lewej listy, aby ustalić priorytety.</p>
                        ) : (
                            prioritizedBonuses.map((bonus, index) => (
                                <div key={bonus.key} className="flex flex-col bg-stone-900/50 border border-purple-900/40 mb-3 rounded-sm shadow-md transition-colors relative overflow-hidden">
                                    <div className="absolute top-0 left-0 h-full bg-purple-900/10 pointer-events-none" style={{ width: `${(bonus.weight / 30) * 100}%` }}></div>

                                    <div className="flex justify-between items-center bg-black/40 p-2 border-b border-purple-900/30 relative z-10">
                                        <div className="flex items-center gap-2">
                                            <span className="text-purple-500 font-bold text-xs">{index + 1}.</span>
                                            <span className="text-stone-200 text-xs font-bold font-serif">{bonus.value}</span>
                                        </div>
                                        <button onClick={() => handleRemoveBonus(bonus)} className="text-stone-600 hover:text-red-500 transition-colors p-1" title="Usuń z priorytetów">
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>

                                    <div className="flex flex-col gap-3 p-2 relative z-10">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex justify-between items-end">
                                                <span className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">Priorytet</span>
                                                <span className="text-xs text-purple-400 font-bold">{bonus.weight} <span className="text-stone-600 text-[9px] font-normal">/ 30</span></span>
                                            </div>
                                            <input
                                                type="range" min="1" max="30" value={bonus.weight}
                                                onChange={(e) => handleUpdateBonus(bonus.key, 'weight', e.target.value)}
                                                className="w-full h-1 bg-stone-950 border border-stone-800 rounded-sm appearance-none cursor-pointer
                                                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-purple-900 [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-purple-400 [&::-webkit-slider-thumb]:rounded-sm [&::-webkit-slider-thumb]:shadow-[0_0_5px_rgba(168,85,247,0.7)] hover:[&::-webkit-slider-thumb]:bg-purple-700 hover:[&::-webkit-slider-thumb]:border-purple-300 transition-all
                                                [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-purple-900 [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-purple-400 [&::-moz-range-thumb]:rounded-sm [&::-moz-range-thumb]:shadow-[0_0_5px_rgba(168,85,247,0.7)] hover:[&::-moz-range-thumb]:bg-purple-700 hover:[&::-moz-range-thumb]:border-purple-300"
                                            />
                                        </div>

                                        <div className="flex items-center justify-between gap-3 bg-black/30 p-1.5 rounded-sm border border-stone-800/50">
                                            <span className="text-[10px] text-stone-500 uppercase tracking-wider whitespace-nowrap">Limit sztuk:</span>
                                            <div className="flex items-center gap-2 w-full justify-end">
                                                <div className="flex items-center gap-1.5 bg-stone-950 border border-stone-700 rounded-sm px-1.5 py-0.5 focus-within:border-purple-600 transition-colors">
                                                    <span className="text-[9px] text-stone-500">MIN</span>
                                                    <input
                                                        type="number" min="0" max="20" value={bonus.min}
                                                        onChange={(e) => handleUpdateBonus(bonus.key, 'min', e.target.value)}
                                                        className="w-8 bg-transparent text-stone-200 text-xs outline-none text-center font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    />
                                                </div>
                                                <span className="text-stone-700">-</span>
                                                <div className="flex items-center gap-1.5 bg-stone-950 border border-stone-700 rounded-sm px-1.5 py-0.5 focus-within:border-purple-600 transition-colors">
                                                    <span className="text-[9px] text-stone-500">MAX</span>
                                                    <input
                                                        type="number" min="0" max="99" value={bonus.max}
                                                        onChange={(e) => handleUpdateBonus(bonus.key, 'max', e.target.value)}
                                                        className="w-8 bg-transparent text-stone-200 text-xs outline-none text-center font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <div className="flex justify-center mt-4 pt-4 border-t border-stone-800/80 shrink-0 relative z-10">
                <button
                    onClick={handleOptimizeClick}
                    disabled={prioritizedBonuses.length === 0 || isOptimizing}
                    className="w-full py-3.5 bg-gradient-to-b from-purple-900 to-black border border-purple-800 hover:from-purple-800 hover:to-black hover:border-purple-500 text-stone-200 font-serif font-bold text-sm uppercase tracking-[0.2em] transition-all shadow-[0_0_15px_rgba(128,0,128,0.3)] hover:shadow-[0_0_25px_rgba(160,32,240,0.5)] disabled:opacity-40 disabled:hover:from-purple-900 disabled:cursor-not-allowed flex items-center justify-center gap-3 rounded-sm"
                >
                    {isOptimizing ? (
                        <>
                            <svg className="animate-spin h-5 w-5 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            OBLICZANIE...
                        </>
                    ) : (
                        "URUCHOM OPTYMALIZATOR"
                    )}
                </button>
            </div>
        </div>
    );
};

export default OptimizerPanel;