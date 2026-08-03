import React, { useState, useEffect } from 'react';
import { useEquipment } from '../context/EquipmentContext';

/**
 * Komponent panelu optymalizatora drifów.
 * Umożliwia użytkownikowi wybór i priorytetyzację bonusów (statystyk),
 * które mają być użyte w procesie optymalizacji drifów.
 * Użytkownik może przeciągać i upuszczać bonusy, aby ustawić ich kolejność,
 * a następnie uruchomić proces optymalizacji, który jest obsługiwany
 * przez `useEquipment` context.
 *
 * @returns {JSX.Element}
 */
const OptimizerPanel = () => {
    const { gameRules, runDrifOptimization } = useEquipment();

    const [availableBonuses, setAvailableBonuses] = useState([]);
    const [prioritizedBonuses, setPrioritizedBonuses] = useState([]);
    const [draggedItem, setDraggedItem] = useState(null);

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

    const handleSelectBonus = (bonus) => {
        setPrioritizedBonuses(prev => [...prev, bonus]);
        setAvailableBonuses(prev => prev.filter(b => b.key !== bonus.key));
    };

    const handleRemoveBonus = (bonus) => {
        setAvailableBonuses(prev => [...prev, bonus].sort((a, b) => a.value.localeCompare(b.value)));
        setPrioritizedBonuses(prev => prev.filter(b => b.key !== bonus.key));
    };

    const handleClearAll = () => {
        setAvailableBonuses(prev => {
            const combined = [...prev, ...prioritizedBonuses];
            return combined.sort((a, b) => a.value.localeCompare(b.value));
        });
        setPrioritizedBonuses([]);
    };

    const handleDragStart = (e, bonus, index) => {
        setDraggedItem({ bonus, index });
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        const draggedOverItem = prioritizedBonuses[index];
        if (draggedItem.bonus.key === draggedOverItem.key) return;

        let items = prioritizedBonuses.filter(b => b.key !== draggedItem.bonus.key);
        items.splice(index, 0, draggedItem.bonus);
        setPrioritizedBonuses(items);
    };

    const handleDragEnd = () => {
        setDraggedItem(null);
    };

    const handleOptimizeClick = async () => {
        if (prioritizedBonuses.length === 0) return;

        setIsOptimizing(true);
        const bonusKeys = prioritizedBonuses.map(b => b.key);

        await runDrifOptimization(bonusKeys);

        setIsOptimizing(false);
    };

    return (
        <div className="bg-gradient-to-b from-stone-900 to-black p-6 border-2 border-stone-800 shadow-[0_0_30px_rgba(0,0,0,0.9)] flex flex-col h-full relative">
            <div className="flex justify-between items-end border-b-4 border-double border-purple-900/70 pb-3 mb-4 shrink-0">
                <h3 className="text-xl font-serif font-bold text-stone-300 uppercase tracking-widest drop-shadow-[0_2px_5px_rgba(0,0,0,1)]">
                    Optymalizator Drifów
                </h3>
            </div>

            <div className="grid grid-cols-2 gap-4 xl:gap-6 flex-1 min-h-0">
                <div className="flex flex-col gap-2 h-full min-h-0">
                    <div className="flex items-center justify-center border-b border-stone-800 pb-2 mb-2 min-h-[34px]">
                        <h4 className="text-stone-400 font-serif font-bold uppercase tracking-widest text-xs sm:text-sm truncate">
                            Dostępne Bonusy
                        </h4>
                    </div>

                    <div className="px-1 mb-1 shrink-0">
                        <input
                            type="text"
                            placeholder="Szukaj statystyki..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-black/60 border border-stone-800 focus:border-green-800/80 rounded-sm p-2 text-sm text-stone-300 font-serif outline-none transition-colors shadow-inner"
                        />
                    </div>

                    <div className="overflow-y-auto pr-2 custom-scrollbar flex-1 min-h-0">
                        {filteredAvailableBonuses.length === 0 ? (
                            <p className="text-center text-stone-600 italic mt-4 text-sm font-serif">Brak wyników wyszukiwania...</p>
                        ) : (
                            filteredAvailableBonuses.map(bonus => (
                                <div key={bonus.key} onClick={() => handleSelectBonus(bonus)}
                                     className="flex justify-between items-center bg-black/60 p-2 border-b border-stone-800 hover:bg-green-900/20 cursor-pointer transition-colors group">
                                    <span className="text-stone-400 text-xs font-serif">{bonus.value}</span>
                                    <svg className="w-4 h-4 text-stone-600 group-hover:text-green-500 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-2 h-full min-h-0">
                    <div className="flex items-center justify-between border-b border-stone-800 pb-2 mb-2 min-h-[34px]">
                        <h4 className="text-stone-400 font-serif font-bold uppercase tracking-widest text-xs sm:text-sm truncate pr-2">
                            Priorytety
                        </h4>
                        {prioritizedBonuses.length > 0 && (
                            <button
                                onClick={handleClearAll}
                                className="text-[10px] bg-red-950/40 hover:bg-red-900/80 text-red-400 hover:text-white border border-red-900/50 px-2 py-1 rounded-sm transition-colors uppercase tracking-wider font-serif shrink-0 shadow-sm"
                            >
                                Wyczyść
                            </button>
                        )}
                    </div>

                    <div className="overflow-y-auto pr-2 custom-scrollbar flex-1 min-h-0">
                        {prioritizedBonuses.length === 0 ? (
                            <p className="text-center text-stone-600 italic mt-10 text-sm font-serif">Wybierz bonusy z lewej listy...</p>
                        ) : (
                            prioritizedBonuses.map((bonus, index) => (
                                <div key={bonus.key}
                                     draggable
                                     onDragStart={(e) => handleDragStart(e, bonus, index)}
                                     onDragOver={(e) => handleDragOver(e, index)}
                                     onDragEnd={handleDragEnd}
                                     onClick={() => handleRemoveBonus(bonus)}
                                     className="flex justify-between items-center bg-purple-950/30 p-2 border-b border-purple-900/40 cursor-grab active:cursor-grabbing hover:bg-red-900/20 group transition-colors"
                                >
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <svg className="w-4 h-4 text-stone-600 cursor-grab active:cursor-grabbing shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                            <circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/>
                                            <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
                                            <circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>
                                        </svg>
                                        <span className="text-purple-400 font-bold ml-1 shrink-0">{index + 1}.</span>
                                        <span className="text-stone-300 text-xs font-serif truncate">{bonus.value}</span>
                                    </div>
                                    <svg className="w-4 h-4 text-stone-600 group-hover:text-red-500 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                    </svg>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <div className="flex justify-center mt-4 pt-4 border-t border-stone-800/50 shrink-0 relative z-10">
                <button
                    onClick={handleOptimizeClick}
                    disabled={prioritizedBonuses.length === 0 || isOptimizing}
                    className="w-full py-3 bg-gradient-to-b from-purple-900 to-black border border-purple-800 hover:from-purple-800 hover:to-black hover:border-purple-600 text-stone-300 font-serif font-bold text-lg uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(128,0,128,0.4)] hover:shadow-[0_0_25px_rgba(160,32,240,0.5)] disabled:opacity-30 disabled:hover:from-purple-900 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                    {isOptimizing ? (
                        <>
                            <svg className="animate-spin h-5 w-5 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            OPTYMALIZOWANIE...
                        </>
                    ) : (
                        "OPTYMALIZUJ"
                    )}
                </button>
            </div>
        </div>
    );
};

export default OptimizerPanel;
