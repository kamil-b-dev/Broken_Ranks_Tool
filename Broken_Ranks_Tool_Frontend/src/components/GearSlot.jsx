import { useState, useEffect } from "react";

const GearSlot = ({ slotKey, label, items, orbs, drifs, onUpdate }) => {
    const [selectedItem, setSelectedItem] = useState("");
    const [selectedOrb, setSelectedOrb] = useState("");
    const [orbLevel, setOrbLevel] = useState("");

    // Pamięć drifów (Teraz z góry określona przez ramy przedmiotu)
    const [selectedDrifs, setSelectedDrifs] = useState([]);
    const [drifTypes, setDrifTypes] = useState({});
    const [drifLevels, setDrifLevels] = useState({});

    const [orbType, setOrbType] = useState("");

    const groupByType = (itemsList) => {
        if (!itemsList || !Array.isArray(itemsList)) return {};
        return itemsList.reduce((acc, item) => {
            const category = item.name;
            if (!category) return acc;
            if (!acc[category]) acc[category] = [];
            acc[category].push(item);
            return acc;
        }, {});
    };

    const groupedOrbs = groupByType(orbs);
    const groupedDrifs = groupByType(drifs);

    // 1. USTALAMY LIMIT DRIFÓW (Przeniesione wyżej!)
    const fullSelectedItem = items.find(i => i.id.toString() === selectedItem.toString());
    let maxDrifs = 0;
    if (fullSelectedItem) {
        switch(fullSelectedItem.tier) {
            case 'I': case 'II': case 'III': maxDrifs = 1; break;
            case 'IV': case 'V': case 'VI': case 'VII': case 'VIII': case 'IX': maxDrifs = 2; break;
            case 'X': case 'XI': case 'XII': maxDrifs = 3; break;
            default: maxDrifs = 0;
        }
    }

    // 2. WYSYŁKA DANYCH
    useEffect(() => {
        // Zabezpieczenie: ucinamy "duchy", jeśli gracz zmienił item na gorszy tier
        const validDrifIds = selectedDrifs.slice(0, maxDrifs).filter(id => id !== "");
        const validDrifLevels = {};
        for (let i = 0; i < maxDrifs; i++) {
            if (drifLevels[i]) validDrifLevels[i] = drifLevels[i];
        }

        onUpdate(slotKey, {
            itemId: selectedItem || null,
            orbId: selectedOrb || null,
            orbLevel: orbLevel || null,
            drifIds: validDrifIds,
            drifLevels: validDrifLevels
        });
    }, [selectedItem, selectedOrb, orbLevel, selectedDrifs, drifLevels, maxDrifs]);

    // 3. FUNKCJE AKTUALIZUJĄCE (usunięto addDrif i removeDrif)
    const updateDrif = (index, value) => {
        const newDrifs = [...selectedDrifs];
        newDrifs[index] = value;
        setSelectedDrifs(newDrifs);
    };

    const updateDrifLevel = (index, value) => {
        setDrifLevels({ ...drifLevels, [index]: value });
    };

    return (
        <div className="flex flex-col items-center gap-3 w-64 p-2">
            <span className="text-xs font-bold text-gray-400">{label}</span>

            {/* 1. PRZEDMIOT */}
            <select
                value={selectedItem}
                onChange={(e) => setSelectedItem(e.target.value)}
                className="w-full bg-neutral-800 text-white p-1 text-xs rounded border-2 border-blue-500 focus:border-blue-400 outline-none text-center cursor-pointer"
            >
                <option value="">-- {label} --</option>
                {items.map((i) => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                ))}
            </select>

            {/* 2. ORB */}
            <div className="w-full flex flex-col items-center mt-1">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Orb</span>

                <div className="flex gap-1 w-full items-center mb-1">
                    <select
                        value={orbType}
                        onChange={(e) => {
                            setOrbType(e.target.value);
                            setSelectedOrb("");
                            setOrbLevel("");
                        }}
                        className="flex-[3] min-w-0 bg-transparent text-orange-400 p-1 text-xs border-b-4 border-red-600 focus:border-red-400 outline-none text-center cursor-pointer"
                    >
                        <option value="" className="bg-neutral-800 text-white">Rodzaj...</option>
                        {Object.keys(groupedOrbs).map(type => (
                            <option key={type} value={type} className="bg-neutral-800 text-white">{type}</option>
                        ))}
                    </select>

                    <select
                        value={selectedOrb}
                        onChange={(e) => {
                            setSelectedOrb(e.target.value);
                            setOrbLevel("");
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
            </div>

            {/* 3. DRIFY (Zależne od Rangi) */}
            <div className="w-full flex flex-col items-center mt-1">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Drify</span>

                <div className="flex flex-col w-full gap-3 items-center">
                    {/* Generujemy dokładnie tyle slotów, ile wynika z tieru */}
                    {Array.from({ length: maxDrifs }).map((_, index) => {
                        const drifId = selectedDrifs[index] || "";
                        const currentType = drifTypes[index] || "";

                        return (
                            <div key={index} className="flex gap-1 w-full items-center">
                                <select
                                    value={currentType}
                                    onChange={(e) => {
                                        setDrifTypes({ ...drifTypes, [index]: e.target.value });
                                        updateDrif(index, "");
                                        updateDrifLevel(index, ""); // Czyścimy lvl przy zmianie rodzaju!
                                    }}
                                    className="flex-[3] min-w-0 bg-transparent text-orange-400 p-1 text-xs border-b-4 border-black focus:border-gray-500 outline-none text-center cursor-pointer"
                                >
                                    <option value="" className="bg-neutral-800 text-white">Rodzaj...</option>
                                    {Object.keys(groupedDrifs).map(type => (
                                        <option key={type} value={type} className="bg-neutral-800 text-white">{type}</option>
                                    ))}
                                </select>

                                <select
                                    value={drifId}
                                    onChange={(e) => {
                                        updateDrif(index, e.target.value);
                                        updateDrifLevel(index, ""); // Czyścimy lvl przy zmianie wielkości!
                                    }}
                                    disabled={!currentType}
                                    className="flex-[3] min-w-0 bg-transparent text-white p-1 text-xs border-b-4 border-black focus:border-gray-500 outline-none text-center disabled:opacity-30 cursor-pointer"
                                >
                                    <option value="" className="bg-neutral-800 text-white">Wielkość...</option>
                                    {currentType && groupedDrifs[currentType]?.map((d) => (
                                        <option key={d.id} value={d.id} className="bg-neutral-800 text-white">
                                            {d.size || d.tier}
                                        </option>
                                    ))}
                                </select>

                                <select
                                    value={drifLevels[index] || ""}
                                    onChange={(e) => updateDrifLevel(index, e.target.value)}
                                    disabled={!drifId}
                                    className="flex-[2] min-w-0 bg-transparent text-white p-1 text-xs border-b-4 border-black focus:border-gray-500 outline-none text-center disabled:opacity-30 cursor-pointer"
                                >
                                    <option value="" className="bg-neutral-800 text-white">Lvl...</option>
                                    {Array.from({ length: 21 }, (_, i) => i + 1).map(num => (
                                        <option key={num} value={num.toString()} className="bg-neutral-800 text-white">
                                            {num}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        );
                    })}

                    {/* Komunikaty dla gracza, gdy slotów jest 0 */}
                    {!fullSelectedItem && (
                        <span className="text-[10px] text-gray-600 uppercase tracking-wider mt-1">Wybierz przedmiot...</span>
                    )}
                    {fullSelectedItem && maxDrifs === 0 && (
                        <span className="text-[10px] text-gray-600 uppercase tracking-wider mt-1">Brak slotów na drify</span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GearSlot;