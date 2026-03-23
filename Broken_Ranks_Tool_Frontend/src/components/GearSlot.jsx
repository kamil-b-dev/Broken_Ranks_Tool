import { useState, useEffect } from "react";

const GearSlot = ({ slotKey, label, items, orbs, drifs, onUpdate }) => {
    const [selectedItem, setSelectedItem] = useState("");
    const [selectedOrb, setSelectedOrb] = useState("");
    const [selectedDrifs, setSelectedDrifs] = useState([]);

    // Stany do zapamiętywania wybranego RODZAJU (z kolumny 'name', np. "Ann")
    const [orbType, setOrbType] = useState("");
    const [drifTypes, setDrifTypes] = useState({});

    const [drifLevels, setDrifLevels] = useState({});
    const [orbLevel, setOrbLevel] = useState("");

    // Grupujemy bezpośrednio po kolumnie 'name' z Twojej bazy
    const groupByType = (itemsList) => {
        if (!itemsList || !Array.isArray(itemsList)) return {};

        return itemsList.reduce((acc, item) => {
            // Zgodnie z bazą: 'name' to rodzaj drifa/orba (np. "Ann", "Amad")
            const category = item.name;

            if (!category) return acc;

            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(item);
            return acc;
        }, {});
    };

    const groupedOrbs = groupByType(orbs);
    const groupedDrifs = groupByType(drifs);

    // Wysyłanie paczki z nowymi poziomami!
    useEffect(() => {
        onUpdate(slotKey, {
            itemId: selectedItem || null,
            orbId: selectedOrb || null,
            orbLevel: orbLevel || null, // <--- DODANE
            drifIds: selectedDrifs.filter(id => id !== ""),
            drifLevels: drifLevels
        });
    }, [selectedItem, selectedOrb, orbLevel, selectedDrifs, drifLevels]);

    const addDrif = () => setSelectedDrifs([...selectedDrifs, ""]);

    const removeDrif = (index) => {
        const newDrifs = selectedDrifs.filter((_, i) => i !== index);
        setSelectedDrifs(newDrifs);
    };

    const updateDrif = (index, value) => {
        const newDrifs = [...selectedDrifs];
        newDrifs[index] = value;
        setSelectedDrifs(newDrifs);
    };

    const  updateDrifLevel = (index, value) => {
        const newLevels = {...drifLevels};
        newLevels[index] = value;
        setDrifLevels(newLevels);
    }

    const fullSelectedItem = items.find(i => i.id.toString() === selectedItem.toString());

    // USTALAMY LIMIT DRIFÓW
    let maxDrifs = 0;
    if (fullSelectedItem) {
        switch(fullSelectedItem.tier) {
            case 'I':
            case 'II':
            case 'III':
                maxDrifs = 1;
                break;
            case 'IV':
            case 'V':
            case 'VI':
            case 'VII':
            case 'VIII':
            case 'IX':
                maxDrifs = 2;
                break;
            case 'X':
            case 'XI':
            case 'XII':
                maxDrifs = 3;
                break;
            default:
                maxDrifs = 0;
        }
    }

    return (
        <div className="flex flex-col items-center gap-3 w-64 p-2">
            <span className="text-xs font-bold text-gray-400">{label}</span>

            {/* 1. PRZEDMIOT: Niebieski Prostokąt */}
            <select
                value={selectedItem}
                onChange={(e) => setSelectedItem(e.target.value)}
                className="w-full bg-neutral-800 text-white p-1 text-xs rounded border-2 border-blue-500 focus:border-blue-400 outline-none text-center"
            >
                <option value="">-- {label} --</option>
                {items.map((i) => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                ))}
            </select>

            {/* 2. ORB: Trzy paski obok siebie (Rodzaj, Wielkość, Lvl) */}
            <div className="flex gap-1 w-full items-center mb-2 mt-1">
                {/* KROK 1: Wybór RODZAJU */}
                <select
                    value={orbType}
                    onChange={(e) => {
                        setOrbType(e.target.value);
                        setSelectedOrb("");
                        setOrbLevel(""); // Resetujemy level przy zmianie rodzaju
                    }}
                    className="flex-[3] min-w-0 bg-transparent text-orange-400 p-1 text-xs border-b-4 border-red-600 focus:border-red-400 outline-none text-center cursor-pointer"
                >
                    <option value="" className="bg-neutral-800 text-white">Rodzaj...</option>
                    {Object.keys(groupedOrbs).map(type => (
                        <option key={type} value={type} className="bg-neutral-800 text-white">{type}</option>
                    ))}
                </select>

                {/* KROK 2: Wybór WIELKOŚCI */}
                <select
                    value={selectedOrb}
                    onChange={(e) => {
                        setSelectedOrb(e.target.value);
                        setOrbLevel(""); // Resetujemy level przy zmianie wielkości
                    }}
                    disabled={!orbType}
                    className="flex-[3] min-w-0 bg-transparent text-white p-1 text-xs border-b-4 border-red-600 focus:border-red-400 outline-none text-center disabled:opacity-30 cursor-pointer"
                >
                    <option value="" className="bg-neutral-800 text-white">Wielkość...</option>
                    {orbType && groupedOrbs[orbType]?.map((orb) => (
                        <option key={orb.id} value={orb.id} className="text-white bg-neutral-800">
                            {orb.size || orb.tier}
                        </option>
                    ))}
                </select>

                {/* KROK 3: Wybór POZIOMU (1-3) */}
                <select
                    value={orbLevel}
                    onChange={(e) => setOrbLevel(e.target.value)}
                    disabled={!selectedOrb}
                    className="flex-[2] min-w-0 bg-transparent text-white p-1 text-xs border-b-4 border-red-600 focus:border-red-400 outline-none text-center disabled:opacity-30 cursor-pointer"
                >
                    <option value="" className="bg-neutral-800 text-white">Lvl...</option>
                    {[1, 2, 3].map(num => (
                        <option key={num} value={num.toString()} className="bg-neutral-800 text-white">
                            {num}
                        </option>
                    ))}
                </select>
            </div>

            {/* 3. DRIFY: Dwie połączone czarne linie */}
            <div className="flex flex-col w-full gap-3 items-center mt-2">
                {selectedDrifs.map((drifId, index) => {
                    const currentType = drifTypes[index] || "";

                    return (
                        <div key={index} className="flex gap-1 w-full items-center">
                            {/* KROK 1: Wybór RODZAJU */}
                            <select
                                value={currentType}
                                onChange={(e) => {
                                    setDrifTypes({ ...drifTypes, [index]: e.target.value });
                                    updateDrif(index, "");
                                }}
                                // ZMIANA: flex-[3] zamiast w-1/2, dodane min-w-0
                                className="flex-[3] min-w-0 bg-transparent text-orange-400 p-1 text-xs border-b-4 border-black focus:border-gray-500 outline-none text-center cursor-pointer"
                            >
                                <option value="" className="bg-neutral-800 text-white">Rodzaj...</option>
                                {Object.keys(groupedDrifs).map(type => (
                                    <option key={type} value={type} className="bg-neutral-800 text-white">{type}</option>
                                ))}
                            </select>

                            {/* KROK 2: Wybór WIELKOŚCI */}
                            <select
                                value={drifId}
                                onChange={(e) => updateDrif(index, e.target.value)}
                                disabled={!currentType}
                                // ZMIANA: flex-[3] zamiast w-1/2, dodane min-w-0
                                className="flex-[3] min-w-0 bg-transparent text-white p-1 text-xs border-b-4 border-black focus:border-gray-500 outline-none text-center disabled:opacity-30 cursor-pointer"
                            >
                                <option value="" className="bg-neutral-800 text-white">Wielkość...</option>
                                {currentType && groupedDrifs[currentType]?.map((d) => (
                                    <option key={d.id} value={d.id} className="bg-neutral-800 text-white">
                                        {d.size || d.tier}
                                    </option>
                                ))}
                            </select>

                            {/* KROK 3: Wybór POZIOMU */}
                            {/* KROK 3: Wybór POZIOMU */}
                            <select
                                value={drifLevels[index] || ""}
                                onChange={(e) => updateDrifLevel(index, e.target.value)}
                                disabled={!drifId}
                                className="flex-[2] min-w-0 bg-transparent text-white p-1 text-xs border-b-4 border-black focus:border-gray-500 outline-none text-center disabled:opacity-30 cursor-pointer"
                            >
                                <option value="" className="bg-neutral-800 text-white">Lvl...</option>
                                {Array.from({ length: 21 }, (_, i) => i + 1).map(num => (
                                    <option
                                        key={num}
                                        value={num.toString()}
                                        className="bg-neutral-800 text-white"
                                    >
                                        {num}
                                    </option>
                                ))}
                            </select>

                            {/* PRZYCISK USUWANIA - dodany mały margines z lewej (ml-1) */}
                            <button onClick={() => removeDrif(index)} className="text-red-500 font-bold hover:text-red-400 ml-1">X</button>
                        </div>
                    );
                })}

                {fullSelectedItem && selectedDrifs.length < maxDrifs && (
                    <button
                        onClick={addDrif}
                        className="text-sm font-bold text-gray-500 hover:text-white mt-1"
                    >
                        + Dodaj Drif
                    </button>
                )}
            </div>
        </div>
    );
};

export default GearSlot;