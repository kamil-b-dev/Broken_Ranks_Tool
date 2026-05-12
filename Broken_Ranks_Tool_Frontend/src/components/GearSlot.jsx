import { useState, useEffect } from "react";
import { ROMAN_TO_INT, SIZE_INDEX, getDrifMaxLvl, getStarColor, formatGroupLabel } from "../utils/GearRules";

const GearSlot = ({ slotKey, label, items, orbs, drifs, onUpdate, allSlots = {}, gameRules }) => {
    const { slotOrbRules = {}, bonusTranslations = {}, elementalTypes = [] } = gameRules || {};

    const [selectedItem, setSelectedItem] = useState("");
    const [itemStars, setItemStars] = useState(1);
    const [hoverStars, setHoverStars] = useState(0);

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
            const category = item.name || item.description || item.bonusType;
            if (!category) return acc;
            if (!acc[category]) acc[category] = [];
            acc[category].push(item);
            return acc;
        }, {});
    };

    const globalUsedOrbs = Object.entries(allSlots)
        .filter(([k, v]) => k !== slotKey && v?.orbId)
        .map(([k, v]) => orbs.find(o => o.id.toString() === v.orbId.toString())?.bonusType)
        .filter(Boolean);

    const allowedOrbCategories = slotOrbRules[slotKey] || [];
    const availableOrbs = orbs.filter(o =>
        !globalUsedOrbs.includes(o.bonusType) &&
        allowedOrbCategories.includes(o.category)
    );
    const groupedOrbs = groupByType(availableOrbs);

    const hasGlobalElemental = Object.entries(allSlots)
        .filter(([k, v]) => k !== slotKey && v?.drifIds)
        .some(([k, v]) => v.drifIds.some(dId => {
            const d = drifs.find(dr => dr.id.toString() === dId.toString());
            return d && elementalTypes.includes(d.bonusType);
        }));

    const fullSelectedItem = items.find(i => i.id.toString() === selectedItem.toString());
    let maxDrifs = 0;
    const tierVal = fullSelectedItem ? (ROMAN_TO_INT[fullSelectedItem.tier] || 0) : 0;

    if (fullSelectedItem) {
        if (tierVal >= 10) maxDrifs = 3;
        else if (tierVal >= 4) maxDrifs = 2;
        else if (tierVal >= 1) maxDrifs = 1;
    }

    const maxDrifIndex = tierVal <= 3 ? 0 : tierVal <= 6 ? 1 : tierVal <= 9 ? 2 : 3;

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
            orbLevel: orbLevel ? parseInt(orbLevel) : null,
            drifIds: validDrifIds.map(id => parseInt(id)),
            drifLevels: validDrifLevels
        });
    }, [selectedItem, itemStars, selectedOrb, orbLevel, selectedDrifs, drifLevels, maxDrifs]);

    const updateDrif = (index, value) => {
        const newDrifs = [...selectedDrifs];
        newDrifs[index] = value;
        setSelectedDrifs(newDrifs);
    };

    const updateDrifLevel = (index, value) => {
        setDrifLevels({ ...drifLevels, [index]: parseInt(value) });
    };

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
                setHoverStars(0);
                setSelectedOrb("");
                setOrbLevel("");
                setOrbType("");
                setSelectedDrifs([]);
                setDrifTypes({});
                setDrifLevels({});
            }
        } catch (error) {}
    };

    const slotClasses = `flex flex-col items-center gap-3 w-64 p-2 rounded-xl transition-all duration-200 border-2 ${
        isDragOver ? "border-green-500 bg-green-900/20 shadow-[0_0_15px_rgba(34,197,94,0.3)] scale-105" : "border-transparent"
    }`;

    if (!gameRules) return <div className="w-64 p-2 text-xs text-gray-500 text-center border border-gray-700 rounded-xl">Ładowanie reguł...</div>;

    return (
        <div
            className={slotClasses}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <span className="text-xs font-bold text-gray-400 pointer-events-none">{label}</span>

            <div className="w-full flex flex-col gap-1.5">
                <select
                    value={selectedItem}
                    onChange={(e) => {
                        setSelectedItem(e.target.value);
                        setItemStars(1);
                        setHoverStars(0);
                        setSelectedOrb("");
                        setOrbLevel("");
                        setOrbType("");
                        setSelectedDrifs([]);
                        setDrifTypes({});
                        setDrifLevels({});
                    }}
                    className="w-full min-w-0 bg-neutral-800 text-white p-1.5 text-xs rounded border-2 border-blue-500 focus:border-blue-400 outline-none text-center cursor-pointer"
                >
                    <option value="">-- {label} --</option>
                    {items.map((i) => (
                        <option key={i.id} value={i.id}>{i.name} {i.tier ? i.tier : ""}</option>
                    ))}
                </select>

                <div className={`flex justify-center gap-1 bg-neutral-900/80 p-1 rounded border border-neutral-700 transition-opacity ${!selectedItem ? "opacity-30 pointer-events-none" : "opacity-100"}`}>
                    {[...Array(9)].map((_, i) => {
                        const starValue = i + 1;
                        const isFilled = starValue <= (hoverStars || itemStars);
                        const colorClass = getStarColor(starValue, isFilled);

                        return (
                            <span
                                key={starValue}
                                className={`cursor-pointer text-lg leading-none transition-all duration-150 transform hover:scale-125 ${colorClass}`}
                                onMouseEnter={() => setHoverStars(starValue)}
                                onMouseLeave={() => setHoverStars(0)}
                                onClick={() => setItemStars(starValue)}
                                title={`Ulepszenie: ${starValue}★`}
                            >
                                ★
                            </span>
                        );
                    })}
                </div>
            </div>

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
                        disabled={!selectedItem}
                        className="flex-[3] min-w-0 bg-transparent text-orange-400 p-1 text-xs border-b-4 border-red-600 focus:border-red-400 outline-none text-center cursor-pointer disabled:opacity-30"
                    >
                        <option value="" className="bg-neutral-800 text-white">Rodzaj...</option>
                        {Object.keys(groupedOrbs).map(type => (
                            <option key={type} value={type} className="bg-neutral-800 text-white">
                                {formatGroupLabel(type, groupedOrbs[type], bonusTranslations)}
                            </option>
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

            <div className="w-full flex flex-col items-center mt-1">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 pointer-events-none">Drify</span>

                <div className="flex flex-col w-full gap-3 items-center">
                    {Array.from({ length: maxDrifs }).map((_, index) => {
                        const drifId = selectedDrifs[index] || "";
                        const currentType = drifTypes[index] || "";

                        const localUsedBonusTypes = selectedDrifs
                            .map((dId, i) => i !== index && dId ? drifs.find(dr => dr.id.toString() === dId.toString())?.bonusType : null)
                            .filter(Boolean);

                        const allowedDrifs = drifs.filter(drif => {
                            if (SIZE_INDEX[drif.size] > maxDrifIndex) return false;
                            if (localUsedBonusTypes.includes(drif.bonusType)) return false;
                            if (elementalTypes.includes(drif.bonusType)) {
                                if (slotKey !== "weapon") return false;
                                if (hasGlobalElemental) return false;
                            }
                            return true;
                        });

                        const currentGroupedDrifs = groupByType(allowedDrifs);

                        const currentDrifObj = drifs.find(d => d.id.toString() === drifId.toString());
                        const maxLvl = currentDrifObj ? getDrifMaxLvl(currentDrifObj.size) : 21;

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
                                    {Object.keys(currentGroupedDrifs).map(type => (
                                        <option key={type} value={type} className="bg-neutral-800 text-white">
                                            {formatGroupLabel(type, currentGroupedDrifs[type], bonusTranslations)}
                                        </option>
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
                                    {currentType && currentGroupedDrifs[currentType]?.map((d) => (
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
                                    {Array.from({ length: maxLvl }, (_, i) => i + 1).map(num => (
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