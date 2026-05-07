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
        <div className="bg-neutral-800 p-6 rounded-xl shadow-lg border border-neutral-700 flex flex-col shrink-0 h-full">
            <div className="flex justify-between items-center border-b-2 border-orange-600 pb-3 mb-4">
                <h3 className="text-xl font-bold text-white">Rozdawanie Statystyk</h3>
                <div className="flex items-center gap-2 bg-neutral-900 px-3 py-1 rounded border border-neutral-600">
                    <span className="text-gray-400 text-sm font-bold">Poziom</span>
                    <input
                        type="number"
                        min="1"
                        max="140"
                        value={level}
                        onChange={(e) => handleLevelChange(e.target.value)}
                        className="bg-transparent text-orange-400 font-bold w-12 text-center outline-none"
                    />
                </div>
            </div>

            <div className="mb-6 p-3 bg-neutral-900 rounded-lg border border-neutral-700 flex justify-between items-center">
                <span className="text-gray-400 text-xs uppercase font-bold">Dostępne punkty:</span>
                <span className={`text-xl font-black ${pointsLeft > 0 ? "text-green-400" : "text-gray-500"}`}>
                    {pointsLeft} / {totalPoints}
                </span>
            </div>

            <div className="grid grid-cols-1 gap-2 flex-1 overflow-y-auto pr-1">
                {Object.keys(statConfig).map((statName) => {
                    const finalValue = statConfig[statName].base + (spentPoints[statName] * statConfig[statName].ratio);

                    return (
                        <div key={statName} className="flex items-center justify-between bg-neutral-900/50 p-3 rounded border border-neutral-700 group hover:border-neutral-500 transition-colors">
                            <div className="flex flex-col">
                                <span className="text-gray-300 text-xs font-bold uppercase">{statName}</span>
                                <span className="text-2xl font-black text-yellow-400">{finalValue}</span>
                            </div>

                            <div className="flex items-center gap-3">
                                {spentPoints[statName] > 0 && (
                                    <span className="text-[10px] text-gray-500 font-bold bg-neutral-800 px-2 py-1 rounded">
                                        +{spentPoints[statName]} pkt
                                    </span>
                                )}

                                <div className="flex gap-1">
                                    <button
                                        onClick={() => handleAddPoint(statName, -1)}
                                        className="w-8 h-8 rounded bg-neutral-700 hover:bg-red-900 text-white font-bold transition-colors disabled:opacity-20"
                                        disabled={spentPoints[statName] <= 0}
                                    >
                                        -
                                    </button>
                                    <button
                                        onClick={() => handleAddPoint(statName, 1)}
                                        className="w-8 h-8 rounded bg-neutral-700 hover:bg-green-700 text-white font-bold transition-colors disabled:opacity-20"
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

            <div className="mt-4 flex justify-between items-center shrink-0">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest italic flex-1">
                </p>
                <button
                    onClick={() => {
                        setSpentPoints({
                            "Siła": 0, "Zręczność": 0, "Moc": 0, "Wiedza": 0, "Pż": 0, "Mana": 0, "Kondycja": 0
                        });
                    }}
                    className="text-xs text-red-400 hover:text-red-300 font-bold uppercase border border-red-500/50 px-3 py-1 rounded transition-colors"
                >
                    Resetuj punkty
                </button>
            </div>
        </div>
    );
};

export default CharacterPanel;