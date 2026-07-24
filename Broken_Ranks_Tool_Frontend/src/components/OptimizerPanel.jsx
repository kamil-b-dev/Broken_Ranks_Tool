import React, { useState, useEffect } from 'react';
import { useEquipment } from '../context/EquipmentContext';

/**
 * Komponent panelu do optymalizacji drifów. Umożliwia użytkownikowi
 * wybór i priorytetyzację bonusów, a następnie uruchomienie algorytmu
 * genetycznego na backendzie w celu znalezienia optymalnego ułożenia drifów.
 * @returns {JSX.Element}
 */
const OptimizerPanel = () => {
    const { gameRules, runDrifOptimization } = useEquipment();
    const [availableBonuses, setAvailableBonuses] = useState([]);
    const [prioritizedBonuses, setPrioritizedBonuses] = useState([]);
    const [draggedItem, setDraggedItem] = useState(null);

    useEffect(() => {
        if (gameRules?.bonusTranslations) {
            const allBonuses = Object.entries(gameRules.bonusTranslations)
                .map(([key, value]) => ({ key, value }))
                .filter(b => gameRules.drifBasePowers[b.key] !== undefined);
            setAvailableBonuses(allBonuses);
        }
    }, [gameRules]);

    /**
     * Przenosi bonus z listy dostępnych do listy priorytetów.
     * @param {object} bonus Obiekt bonusu do dodania.
     */
    const handleSelectBonus = (bonus) => {
        setPrioritizedBonuses(prev => [...prev, bonus]);
        setAvailableBonuses(prev => prev.filter(b => b.key !== bonus.key));
    };

    /**
     * Usuwa bonus z listy priorytetów i przywraca go do listy dostępnych.
     * @param {object} bonus Obiekt bonusu do usunięcia.
     */
    const handleRemoveBonus = (bonus) => {
        setAvailableBonuses(prev => [...prev, bonus].sort((a, b) => a.value.localeCompare(b.value)));
        setPrioritizedBonuses(prev => prev.filter(b => b.key !== bonus.key));
    };

    /**
     * Rozpoczyna przeciąganie elementu z listy priorytetów.
     * @param {React.DragEvent} e Zdarzenie przeciągania.
     * @param {object} bonus Przeciągany bonus.
     * @param {number} index Indeks przeciąganego bonusu.
     */
    const handleDragStart = (e, bonus, index) => {
        setDraggedItem({ bonus, index });
        e.dataTransfer.effectAllowed = 'move';
    };

    /**
     * Obsługuje zdarzenie najechania przeciąganym elementem na inny.
     * Zmienia kolejność na liście priorytetów w czasie rzeczywistym.
     * @param {React.DragEvent} e Zdarzenie przeciągania.
     * @param {number} index Indeks elementu, nad którym znajduje się przeciągany element.
     */
    const handleDragOver = (e, index) => {
        e.preventDefault();
        const draggedOverItem = prioritizedBonuses[index];
        if (draggedItem.bonus.key === draggedOverItem.key) return;

        let items = prioritizedBonuses.filter(b => b.key !== draggedItem.bonus.key);
        items.splice(index, 0, draggedItem.bonus);
        setPrioritizedBonuses(items);
    };

    /**
     * Kończy proces przeciągania, czyszcząc stan.
     */
    const handleDragEnd = () => {
        setDraggedItem(null);
    };

    /**
     * Uruchamia proces optymalizacji, wysyłając priorytety do backendu.
     */
    const handleOptimizeClick = () => {
        if (prioritizedBonuses.length === 0) {
            alert("Wybierz przynajmniej jeden bonus do optymalizacji.");
            return;
        }
        const bonusKeys = prioritizedBonuses.map(b => b.key);
        runDrifOptimization(bonusKeys);
    };

    return (
        <div className="bg-gradient-to-b from-stone-900 to-black p-6 border-2 border-stone-800 shadow-[0_0_30px_rgba(0,0,0,0.9)] flex flex-col h-full relative">
            <div className="flex justify-between items-end border-b-4 border-double border-purple-900/70 pb-3 mb-4 shrink-0">
                <h3 className="text-xl font-serif font-bold text-stone-300 uppercase tracking-widest drop-shadow-[0_2px_5px_rgba(0,0,0,1)]">
                    Optymalizator Drifów
                </h3>
            </div>

            <div className="grid grid-cols-2 gap-6 flex-1">
                <div className="flex flex-col gap-2">
                    <h4 className="text-center text-stone-400 font-serif font-bold uppercase tracking-[0.2em] border-b border-stone-800 pb-2 mb-2">
                        Dostępne Bonusy
                    </h4>
                    <div className="overflow-y-auto pr-2 custom-scrollbar">
                        {availableBonuses.map(bonus => (
                            <div key={bonus.key} onClick={() => handleSelectBonus(bonus)}
                                 className="flex justify-between items-center bg-black/60 p-2 border-b border-stone-800 hover:bg-green-900/20 cursor-pointer transition-colors">
                                <span className="text-stone-400 text-xs font-serif">{bonus.value}</span>
                                <span className="text-green-500 font-bold">+</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <h4 className="text-center text-stone-400 font-serif font-bold uppercase tracking-[0.2em] border-b border-stone-800 pb-2 mb-2">
                        Priorytety (przeciągnij, by zmienić)
                    </h4>
                    <div className="overflow-y-auto pr-2 custom-scrollbar">
                        {prioritizedBonuses.length === 0 ? (
                            <p className="text-center text-stone-600 italic mt-10">Wybierz bonusy z lewej listy...</p>
                        ) : (
                            prioritizedBonuses.map((bonus, index) => (
                                <div key={bonus.key}
                                     draggable
                                     onDragStart={(e) => handleDragStart(e, bonus, index)}
                                     onDragOver={(e) => handleDragOver(e, index)}
                                     onDragEnd={handleDragEnd}
                                     onClick={() => handleRemoveBonus(bonus)}
                                     className="flex justify-between items-center bg-purple-950/50 p-2 border-b border-purple-800/50 cursor-grab active:cursor-grabbing hover:bg-red-900/20"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-purple-400 font-bold">{index + 1}.</span>
                                        <span className="text-stone-300 text-xs font-serif">{bonus.value}</span>
                                    </div>
                                    <span className="text-red-500 font-bold">-</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <div className="flex justify-center mt-6">
                <button
                    onClick={handleOptimizeClick}
                    disabled={prioritizedBonuses.length === 0}
                    className="w-full py-3 bg-gradient-to-b from-purple-900 to-black border border-purple-800 hover:from-purple-800 hover:to-black hover:border-purple-600 text-stone-300 font-serif font-bold text-lg uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(128,0,128,0.4)] hover:shadow-[0_0_25px_rgba(160,32,240,0.5)] disabled:opacity-30 disabled:hover:from-purple-900 disabled:cursor-not-allowed"
                >
                    Optymalizuj
                </button>
            </div>
        </div>
    );
};

export default OptimizerPanel;
