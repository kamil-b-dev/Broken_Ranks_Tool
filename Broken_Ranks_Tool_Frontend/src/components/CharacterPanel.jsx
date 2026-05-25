import { useState, useEffect } from "react";

const CharacterPanel = ({ onStatsChange }) => {
    const [level, setLevel] = useState(1);

    const [spentPoints, setSpentPoints] = useState({
        "Siła": 0,
        "Zręczność": 0,
        "Moc": 0,
        "Wiedza": 0,
        "Pż": 0,
        "Mana": 0,
        "Kondycja": 0
    });

    const statConfig = {
        "Siła": { base: 10, ratio: 1 },
        "Zręczność": { base: 10, ratio: 1 },
        "Moc": { base: 10, ratio: 1 },
        "Wiedza": { base: 10, ratio: 1 },
        "Pż": { base: 200, ratio: 10 },
        "Mana": { base: 200, ratio: 10 },
        "Kondycja": { base: 200, ratio: 10 }
    };

    const totalPoints = (level - 1) * 4;
    const currentSpent = Object.values(spentPoints).reduce((a, b) => a + b, 0);
    const pointsLeft = totalPoints - currentSpent;

    useEffect(() => {
        const finalStats = {};
        Object.keys(statConfig).forEach(name => {
            finalStats[name] = statConfig[name].base + (spentPoints[name] * statConfig[name].ratio);
        });
        onStatsChange(finalStats);
    }, [spentPoints, level]);

    const handleAddPoint = (statName, amount) => {
        if (amount > 0 && pointsLeft < amount) return;
        if (amount < 0 && spentPoints[statName] + amount < 0) return;

        setSpentPoints(prev => ({
            ...prev,
            [statName]: prev[statName] + amount
        }));
    };

    const handleLevelChange = (newLevelValue) => {
        const newLevel = Math.min(140, Math.max(1, parseInt(newLevelValue) || 1));
        setLevel(newLevel);

        const newTotalPoints = (newLevel - 1) * 4;
        const newCurrentSpent = Object.values(spentPoints).reduce((a, b) => a + b, 0);

        if (newCurrentSpent > newTotalPoints) {
            let pointsToRemove = newCurrentSpent - newTotalPoints;
            let updatedSpent = { ...spentPoints };
            const statNames = Object.keys(updatedSpent);

            while (pointsToRemove > 0) {
                for (let stat of statNames) {
                    if (updatedSpent[stat] > 0 && pointsToRemove > 0) {
                        updatedSpent[stat] -= 1;
                        pointsToRemove -= 1;
                    }
                }
            }
            setSpentPoints(updatedSpent);
        }
    };

    return (
        <div className="bg-gradient-to-b from-stone-900 to-black p-6 border-2 border-stone-800 shadow-[0_0_30px_rgba(0,0,0,0.9)] flex flex-col shrink-0 h-full w-full">
            <div className="flex justify-between items-end border-b-4 border-double border-red-900/70 pb-3 mb-4">
                <h3 className="text-xl font-serif font-bold text-stone-300 uppercase tracking-widest drop-shadow-[0_2px_5px_rgba(0,0,0,1)]">
                    Rozwój Bohatera
                </h3>
                <div className="flex items-center gap-2 bg-black/60 px-3 py-1 border border-stone-700 shadow-[inset_0_0_10px_rgba(0,0,0,0.8)]">
                    <span className="text-stone-400 text-xs font-serif uppercase tracking-wider">Poziom</span>
                    <input
                        type="number"
                        min="1"
                        max="140"
                        value={level}
                        onChange={(e) => handleLevelChange(e.target.value)}
                        className="bg-transparent text-amber-600 font-bold font-serif w-12 text-center outline-none"
                    />
                </div>
            </div>

            <div className="mb-6 p-3 bg-stone-950 border border-stone-800 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] flex justify-between items-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-900/5 to-transparent pointer-events-none"></div>
                <span className="text-stone-400 text-xs font-serif uppercase tracking-widest relative z-10">Dostępne punkty:</span>
                <span className={`text-xl font-bold font-serif relative z-10 transition-colors ${pointsLeft > 0 ? "text-amber-600 drop-shadow-[0_0_5px_rgba(217,119,6,0.5)]" : "text-stone-600"}`}>
                    {pointsLeft} / {totalPoints}
                </span>
            </div>

            <div className="grid grid-cols-1 gap-1 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {Object.keys(statConfig).map((statName) => {
                    const finalValue = statConfig[statName].base + (spentPoints[statName] * statConfig[statName].ratio);

                    return (
                        <div key={statName} className="flex items-center justify-between bg-black/60 p-3 border-b border-stone-800 group hover:bg-stone-900/50 transition-colors">
                            <div className="flex flex-col">
                                <span className="text-stone-400 text-xs font-serif uppercase tracking-wider">{statName}</span>
                                <span className="text-2xl font-bold font-serif text-stone-200 group-hover:text-amber-500 transition-colors">{finalValue}</span>
                            </div>

                            <div className="flex items-center gap-3">
                                {spentPoints[statName] > 0 && (
                                    <span className="text-[10px] text-amber-700 font-serif font-bold bg-stone-950 border border-amber-900/30 px-2 py-1 shadow-[inset_0_0_10px_rgba(0,0,0,1)]">
                                        +{spentPoints[statName]} pkt
                                    </span>
                                )}

                                <div className="flex gap-1.5">
                                    <button
                                        onClick={() => handleAddPoint(statName, -1)}
                                        className="w-8 h-8 flex items-center justify-center bg-gradient-to-b from-stone-800 to-stone-900 border border-stone-700 hover:from-red-900 hover:to-black hover:border-red-800 text-stone-300 font-serif font-bold transition-all disabled:opacity-30 disabled:hover:from-stone-800 disabled:hover:to-stone-900 disabled:hover:border-stone-700"
                                        disabled={spentPoints[statName] <= 0}
                                    >
                                        -
                                    </button>
                                    <button
                                        onClick={() => handleAddPoint(statName, 1)}
                                        className="w-8 h-8 flex items-center justify-center bg-gradient-to-b from-stone-800 to-stone-900 border border-stone-700 hover:from-amber-800 hover:to-black hover:border-amber-700 text-stone-300 font-serif font-bold transition-all disabled:opacity-30 disabled:hover:from-stone-800 disabled:hover:to-stone-900 disabled:hover:border-stone-700"
                                        disabled={pointsLeft <= 0}
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-4 flex justify-end items-center shrink-0">
                <button
                    onClick={() => {
                        setSpentPoints({
                            "Siła": 0, "Zręczność": 0, "Moc": 0, "Wiedza": 0, "Pż": 0, "Mana": 0, "Kondycja": 0
                        });
                    }}
                    className="text-xs text-red-800 hover:text-red-500 font-serif font-bold uppercase tracking-widest border border-red-900/50 bg-black/50 px-4 py-2 hover:bg-red-900/20 transition-colors shadow-inner"
                >
                    Zresetuj
                </button>
            </div>
        </div>
    );
};

export default CharacterPanel;