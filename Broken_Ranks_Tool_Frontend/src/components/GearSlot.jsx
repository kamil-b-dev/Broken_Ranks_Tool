import { useState, useEffect } from "react";

const GearSlot = ({ slotKey, label, items, orbs, drifs, onUpdate }) => {
    const [selectedItem, setSelectedItem] = useState("");
    const [itemStars, setItemStars] = useState(1); // Domyślnie 1 gwiazdka
    const [selectedOrb, setSelectedOrb] = useState("");
    const [orbLevel, setOrbLevel] = useState("");

    const [selectedDrifs, setSelectedDrifs] = useState([]);
    const [drifTypes, setDrifTypes] = useState({});
    const [drifLevels, setDrifLevels] = useState({});

    const [orbType, setOrbType] = useState("");

    const [isDragOver, setIsDragOver] = useState(false);

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

    useEffect(() => {
        const validDrifIds = selectedDrifs.slice(0, maxDrifs).filter(id => id !== "");
        const validDrifLevels = {};
        for (let i = 0; i < maxDrifs; i++) {
            if (drifLevels[i]) validDrifLevels[i] = drifLevels[i];
        }

        onUpdate(slotKey, {
            itemId: selectedItem || null,
            itemStars: itemStars,
            orbId: selectedOrb || null,
            orbLevel: orbLevel || null,
            drifIds: validDrifIds,
            drifLevels: validDrifLevels
        });
    }, [selectedItem, itemStars, selectedOrb, orbLevel, selectedDrifs, drifLevels, maxDrifs]);

    const updateDrif = (index, value) => {
        const newDrifs = [...selectedDrifs];
        newDrifs[index] = value;
        setSelectedDrifs(newDrifs);
    };

    const updateDrifLevel = (index, value) => {
        setDrifLevels({ ...drifLevels, [index]: value });
    };

    //FUNKCJE DRAG & DROP
    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);

        try {
            const data = JSON.parse(e.dataTransfer.getData("application/json"));

            if (items.some(i => i.id.toString() === data.id.toString())) {
                setSelectedItem(data.id.toString());
                setItemStars(1);
            } else {
                console.warn("Ten przedmiot nie pasuje do tego slota!");
            }
        } catch (error) {
            console.error("Błąd podczas upuszczania przedmiotu:", error);
        }
    };

    const slotClasses = `flex flex-col items-center gap-3 w-64 p-2 rounded-xl transition-all duration-200 border-2 ${
        isDragOver ? "border-green-500 bg-green-900/20 shadow-[0_0_15px_rgba(34,197,94,0.3)] scale-105" : "border-transparent"
    }`;

    return (
        <div
            className={slotClasses}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <span className="text-xs font-bold text-gray-400 pointer-events-none">{label}</span>

            {/* PRZEDMIOT I GWIAZDKI */}
            <div className="w-full flex gap-1">
                <select
                    value={selectedItem}
                    onChange={(e) => {
                        setSelectedItem(e.target.value);
                        setItemStars(1);
                    }}
                    className="flex-[4] min-w-0 bg-neutral-800 text-white p-1 text-xs rounded border-2 border-blue-500 focus:border-blue-400 outline-none text-center cursor-pointer"
                >
                    <option value="">-- {label} --</option>
                    {items.map((i) => (
                        <option key={i.id} value={i.id}>{i.name}</option>
                    ))}
                </select>

                <select
                    value={itemStars}
                    onChange={(e) => setItemStars(parseInt(e.target.value))}
                    disabled={!selectedItem}
                    className="flex-[1] min-w-0 bg-yellow-600/20 text-yellow-500 p-1 text-xs rounded border-2 border-yellow-600 focus:border-yellow-400 outline-none text-center cursor-pointer disabled:opacity-30 font-bold"
                >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                        <option key={num} value={num} className="bg-neutral-800 text-yellow-500">
                            {num}
                        </option>
                    ))}
                </select>
            </div>

            {/* ORB */}
            <div className="w-full flex flex-col items-center mt-1">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 pointer-events-none">Orb</span>

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

            {/* DRIFY */}
            <div className="w-full flex flex-col items-center mt-1">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 pointer-events-none">Drify</span>

                <div className="flex flex-col w-full gap-3 items-center">
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
                                        updateDrifLevel(index, "");
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
                                        updateDrifLevel(index, "");
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

                    {!fullSelectedItem && (
                        <span className="text-[10px] text-gray-600 uppercase tracking-wider mt-1 pointer-events-none">Wybierz przedmiot...</span>
                    )}
                    {fullSelectedItem && maxDrifs === 0 && (
                        <span className="text-[10px] text-gray-600 uppercase tracking-wider mt-1 pointer-events-none">Brak slotów na drify</span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GearSlot;