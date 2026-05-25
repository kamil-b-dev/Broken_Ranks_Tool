import { useState, useEffect } from "react";
import { ROMAN_TO_INT, SIZE_INDEX, DRIF_MULTIPLIERS, getDrifMaxLvl, getStarColor, formatGroupLabel } from "../utils/GearRules";

const getEffectiveMultiplier = (level) => {
    const lvl = parseInt(level) || 1;
    if (lvl <= 6) return 1;
    if (lvl <= 11) return 2;
    if (lvl <= 16) return 3;
    return 4;
};

const GearSlot = ({ slotKey, label, items, orbs, drifs, onUpdate, allSlots = {}, gameRules }) => {
    const { slotOrbRules = {}, bonusTranslations = {}, elementalTypes = [], drifBasePowers = {} } = gameRules || {};

    const [selectedItem, setSelectedItem] = useState("");
    const [itemStars, setItemStars] = useState(1);
    const [hoverStars, setHoverStars] = useState(0);

    const [selectedOrb, setSelectedOrb] = useState("");
    const [orbLevel, setOrbLevel] = useState("");

    const [selectedDrifs, setSelectedDrifs] = useState([]);
    const [drifTypes, setDrifTypes] = useState({});
    const [drifLevels, setDrifLevels] = useState({});

    const [orbType, setOrbType] = useState("");
    const [dragOverZone, setDragOverZone] = useState(null);

    const getRarityColor = (rarity) => {
        if (!rarity) return "text-stone-300";
        switch(rarity.toUpperCase()) {
            case 'SET': return "text-green-700 font-bold";
            case 'EPIC': return "text-purple-700 font-bold";
            case 'LEGENDARY': return "text-amber-600 font-bold";
            case 'RARE': return "text-blue-700 font-bold";
            default: return "text-stone-300";
        }
    };

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
    const tierVal = fullSelectedItem ? (ROMAN_TO_INT[fullSelectedItem.tier] || 0) : 0;

    let maxDrifs = 0;
    if (fullSelectedItem) {
        if (tierVal >= 10) maxDrifs = 3;
        else if (tierVal >= 4) maxDrifs = 2;
        else if (tierVal >= 1) maxDrifs = 1;

        if ((tierVal === 2 || tierVal === 3) && itemStars >= 7) {
            maxDrifs += 1;
        }
    }

    const maxDrifIndex = tierVal <= 3 ? 0 : tierVal <= 6 ? 1 : tierVal <= 9 ? 2 : 3;

    const baseCapacity = fullSelectedItem?.capacity || 0;
    let capacityBonus = 0;
    if (itemStars >= 7 && itemStars < 8) capacityBonus = 1;
    else if (itemStars >= 8 && itemStars < 9) capacityBonus = 2;
    else if (itemStars >= 9) capacityBonus = 4;

    const itemCapacity = baseCapacity > 0 ? baseCapacity + capacityBonus : 0;

    const currentPowerUsed = selectedDrifs.reduce((sum, drifId, index) => {
        if (!drifId) return sum;
        const drif = drifs.find(d => d.id.toString() === drifId.toString());
        if (!drif) return sum;

        const basePower = drifBasePowers[drif.bonusType] || 0;
        const multiplier = getEffectiveMultiplier(drifLevels[index]);

        return sum + (basePower * multiplier);
    }, 0);

    const isOverCapacity = currentPowerUsed > itemCapacity;
    const isAtMaxCapacity = currentPowerUsed === itemCapacity && itemCapacity > 0;
    const capacityPercentage = itemCapacity > 0 ? Math.min((currentPowerUsed / itemCapacity) * 100, 100) : 0;

    const currentOrbObj = orbs.find(o => o.id.toString() === selectedOrb.toString());
    const isSubOrb = currentOrbObj?.size?.toUpperCase() === "SUBORB";
    const availableOrbLevels = isSubOrb ? [1] : [1, 2, 3];

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

    const handleDragOver = (e, zone) => {
        e.preventDefault();
        setDragOverZone(zone);
    };

    const handleDragLeave = () => {
        setDragOverZone(null);
    };

    const handleDrop = (e, zone) => {
        e.preventDefault();
        setDragOverZone(null);
        try {
            const data = JSON.parse(e.dataTransfer.getData("application/json"));

            if (data.dragType === "items" && zone === "item") {
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
            } else if (data.dragType === "orbs" && zone === "orb") {
                if (!selectedItem) return;
                if (allowedOrbCategories.length > 0 && !allowedOrbCategories.includes(data.category)) return;

                const typeKey = data.name || data.description || data.bonusType;
                setOrbType(typeKey);
                setSelectedOrb(data.id.toString());
                setOrbLevel("1");
            } else if (data.dragType === "drifs" && zone.startsWith("drif-")) {
                if (!selectedItem || maxDrifs === 0) return;

                const targetIndex = parseInt(zone.split('-')[1]);

                if (SIZE_INDEX[data.size?.toUpperCase()] > maxDrifIndex) return;

                const localUsedBonusTypes = selectedDrifs
                    .map((dId, i) => i !== targetIndex && dId ? drifs.find(dr => dr.id.toString() === dId.toString())?.bonusType : null)
                    .filter(Boolean);

                if (localUsedBonusTypes.includes(data.bonusType)) return;

                if (elementalTypes.includes(data.bonusType)) {
                    if (slotKey !== "weapon") return;
                    if (hasGlobalElemental) return;
                    const hasLocalElemental = localUsedBonusTypes.some(type => elementalTypes.includes(type));
                    if (hasLocalElemental) return;
                }

                const typeKey = data.name || data.description || data.bonusType;
                setDrifTypes(prev => ({ ...prev, [targetIndex]: typeKey }));

                setSelectedDrifs(prev => {
                    const next = [...prev];
                    while (next.length < maxDrifs) next.push("");
                    next[targetIndex] = data.id.toString();
                    return next;
                });

                setDrifLevels(prev => ({ ...prev, [targetIndex]: 1 }));
            }
        } catch (error) {}
    };

    const slotClasses = `flex flex-col items-center gap-3 w-64 p-4 bg-gradient-to-b from-stone-900 to-black transition-all duration-200 border-2 relative overflow-hidden shadow-[inset_0_0_20px_rgba(0,0,0,0.9),0_0_15px_rgba(0,0,0,0.8)] 
        ${isOverCapacity ? "border-rose-900 shadow-[inset_0_0_40px_rgba(153,27,27,0.4),0_0_20px_rgba(153,27,27,0.6)]" : "border-stone-700"}`;

    if (!gameRules) return <div className="w-64 p-3 text-xs text-stone-500 font-serif text-center border border-stone-800 bg-black">Ładowanie potęgi...</div>;

    return (
        <div className={slotClasses}>
            <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-red-900 via-rose-700 to-red-900"></div>

            <span className="text-xs font-serif font-bold text-stone-400 uppercase tracking-widest pointer-events-none drop-shadow-[0_2px_2px_rgba(0,0,0,1)]">{label}</span>

            <div
                className={`w-full flex flex-col gap-1.5 p-2 bg-black/60 border transition-colors shadow-[inset_0_0_10px_rgba(0,0,0,1)] ${dragOverZone === 'item' ? 'border-amber-700/50 bg-amber-900/10' : 'border-stone-800'}`}
                onDragOver={(e) => handleDragOver(e, 'item')}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, 'item')}
            >
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
                    className={`w-full bg-black/80 text-xs font-serif border border-stone-700 focus:border-rose-900 p-1.5 outline-none text-center cursor-pointer shadow-inner ${
                        fullSelectedItem ? getRarityColor(fullSelectedItem.rarity) : "text-stone-300"
                    }`}
                >
                    <option value="" className="text-stone-600">-- {label} --</option>
                    {items.map((i) => (
                        <option key={i.id} value={i.id} className={`bg-stone-950 ${getRarityColor(i.rarity)}`}>
                            {i.name} {i.tier ? i.tier : ""}
                        </option>
                    ))}
                </select>

                <div className={`flex justify-center gap-1 bg-stone-950 p-1 border border-stone-800 shadow-inner transition-opacity ${!selectedItem ? "opacity-30 pointer-events-none" : "opacity-100"}`}>
                    {[...Array(9)].map((_, i) => {
                        const starValue = i + 1;
                        const isFilled = starValue <= (hoverStars || itemStars);
                        const colorClass = getStarColor(starValue, isFilled);
                        return (
                            <span
                                key={starValue}
                                className={`cursor-pointer text-lg leading-none transition-all duration-150 transform hover:scale-125 drop-shadow-[0_1px_1px_rgba(0,0,0,1)] ${colorClass}`}
                                onMouseEnter={() => setHoverStars(starValue)}
                                onMouseLeave={() => setHoverStars(0)}
                                onClick={() => setItemStars(starValue)}
                                title={`Wzmocnienie: ${starValue}★`}
                            >
                                ★
                            </span>
                        );
                    })}
                </div>
            </div>

            <div className="w-full flex flex-col items-center mt-1">
                <span className="text-[10px] font-serif font-bold text-rose-800/80 uppercase tracking-widest mb-1 pointer-events-none drop-shadow-md">Orb</span>

                <div
                    className={`flex gap-1 w-full items-center mb-1 p-1.5 bg-black/60 border transition-colors shadow-[inset_0_0_15px_rgba(0,0,0,0.8)] ${dragOverZone === 'orb' ? 'border-rose-900/50 bg-rose-950/20' : 'border-stone-800'}`}
                    onDragOver={(e) => handleDragOver(e, 'orb')}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, 'orb')}
                >
                    <select
                        value={orbType}
                        onChange={(e) => {
                            setOrbType(e.target.value);
                            setSelectedOrb("");
                            setOrbLevel("");
                        }}
                        disabled={!selectedItem}
                        className="flex-[3] min-w-0 bg-transparent text-rose-700 font-serif p-1 text-xs border-b border-stone-800 focus:border-rose-900 outline-none text-center cursor-pointer disabled:opacity-30"
                    >
                        <option value="" className="bg-stone-950 text-stone-500">Rodzaj...</option>
                        {Object.keys(groupedOrbs).map(type => (
                            <option key={type} value={type} className="bg-stone-950 text-stone-300">
                                {formatGroupLabel(type, groupedOrbs[type], bonusTranslations)}
                            </option>
                        ))}
                    </select>

                    <select
                        value={selectedOrb}
                        onChange={(e) => {
                            const val = e.target.value;
                            setSelectedOrb(val);
                            const found = orbs.find(o => o.id.toString() === val.toString());
                            if (found && found.size?.toUpperCase() === "SUBORB") {
                                setOrbLevel("1");
                            } else {
                                setOrbLevel("");
                            }
                        }}
                        disabled={!orbType}
                        className="flex-[3] min-w-0 bg-transparent text-stone-300 font-serif p-1 text-xs border-b border-stone-800 focus:border-rose-900 outline-none text-center disabled:opacity-30 cursor-pointer"
                    >
                        <option value="" className="bg-stone-950 text-stone-500">Wymiar...</option>
                        {orbType && groupedOrbs[orbType]?.map((orb) => (
                            <option key={orb.id} value={orb.id} className="text-stone-300 bg-stone-950">
                                {orb.size || orb.tier}
                            </option>
                        ))}
                    </select>

                    <select
                        value={orbLevel}
                        onChange={(e) => setOrbLevel(e.target.value)}
                        disabled={!selectedOrb || isSubOrb}
                        className="flex-[2] min-w-0 bg-transparent text-stone-300 font-serif p-1 text-xs border-b border-stone-800 focus:border-rose-900 outline-none text-center disabled:opacity-30 cursor-pointer"
                    >
                        <option value="" className="bg-stone-950 text-stone-500">Moc...</option>
                        {availableOrbLevels.map(num => (
                            <option key={num} value={num.toString()} className="bg-stone-950 text-stone-300">
                                {num}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="w-full flex flex-col items-center mt-1">
                <div className="w-full flex justify-between items-center mb-1">
                    <span className="text-[10px] font-serif font-bold text-amber-800/80 uppercase tracking-widest pointer-events-none drop-shadow-md">Drify</span>
                    {fullSelectedItem && itemCapacity > 0 && (
                        <span className={`text-[10px] font-serif font-bold uppercase tracking-wider ${isOverCapacity ? 'text-rose-600 animate-pulse' : (isAtMaxCapacity ? 'text-rose-700' : 'text-stone-500')}`}>
                            Waga: {currentPowerUsed}/{itemCapacity}
                        </span>
                    )}
                </div>

                {fullSelectedItem && itemCapacity > 0 && (
                    <div className="w-full bg-black border border-stone-800 shadow-inner h-1 mb-2">
                        <div
                            className={`h-full transition-all duration-300 ${isOverCapacity || isAtMaxCapacity ? 'bg-gradient-to-r from-rose-900 to-red-600' : 'bg-gradient-to-r from-stone-700 to-stone-400'}`}
                            style={{ width: `${Math.min(capacityPercentage, 100)}%` }}
                        ></div>
                    </div>
                )}

                <div className="flex flex-col w-full gap-2 items-center">
                    {Array.from({ length: maxDrifs }).map((_, index) => {
                        const drifId = selectedDrifs[index] || "";
                        const currentType = drifTypes[index] || "";

                        const localUsedBonusTypes = selectedDrifs
                            .map((dId, i) => i !== index && dId ? drifs.find(dr => dr.id.toString() === dId.toString())?.bonusType : null)
                            .filter(Boolean);

                        const allowedDrifs = drifs.filter(drif => {
                            if (SIZE_INDEX[drif.size?.toUpperCase()] > maxDrifIndex) return false;

                            if (localUsedBonusTypes.includes(drif.bonusType)) return false;

                            if (elementalTypes.includes(drif.bonusType)) {
                                if (slotKey !== "weapon") return false;
                                if (hasGlobalElemental) return false;
                                const hasLocalElemental = localUsedBonusTypes.some(type => elementalTypes.includes(type));
                                if (hasLocalElemental) return false;
                            }

                            return true;
                        });

                        const currentGroupedDrifs = groupByType(allowedDrifs);

                        const currentDrifObj = drifs.find(d => d.id.toString() === drifId.toString());
                        const maxLvl = currentDrifObj ? getDrifMaxLvl(currentDrifObj.size) : 21;

                        const basePwrForCurrent = currentDrifObj ? (drifBasePowers[currentDrifObj.bonusType] || 0) : 0;
                        const currentDrifCost = basePwrForCurrent * getEffectiveMultiplier(drifLevels[index]);
                        const powerWithoutThisDrif = currentPowerUsed - currentDrifCost;

                        return (
                            <div
                                key={index}
                                className={`flex gap-1 w-full items-center p-1.5 bg-black/60 border transition-colors shadow-[inset_0_0_15px_rgba(0,0,0,0.8)] ${dragOverZone === `drif-${index}` ? 'border-amber-800/50 bg-amber-950/20' : 'border-stone-800'}`}
                                onDragOver={(e) => handleDragOver(e, `drif-${index}`)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, `drif-${index}`)}
                            >
                                <select
                                    value={currentType}
                                    onChange={(e) => {
                                        setDrifTypes(prev => ({ ...prev, [index]: e.target.value }));
                                        setSelectedDrifs(prev => {
                                            const next = [...prev];
                                            next[index] = "";
                                            return next;
                                        });
                                        setDrifLevels(prev => ({ ...prev, [index]: parseInt("") }));
                                    }}
                                    className={`flex-[3] min-w-0 bg-transparent text-amber-600 font-serif p-1 text-xs border-b border-stone-800 focus:border-rose-900 outline-none text-center cursor-pointer ${isOverCapacity ? 'border-rose-900/50' : 'border-stone-800'}`}
                                >
                                    <option value="" className="bg-stone-950 text-stone-500">Rodzaj...</option>
                                    {Object.keys(currentGroupedDrifs).map(type => (
                                        <option key={type} value={type} className="bg-stone-950 text-stone-300">
                                            {formatGroupLabel(type, currentGroupedDrifs[type], bonusTranslations)}
                                        </option>
                                    ))}
                                </select>

                                <select
                                    value={drifId}
                                    onChange={(e) => {
                                        setSelectedDrifs(prev => {
                                            const next = [...prev];
                                            next[index] = e.target.value;
                                            return next;
                                        });
                                        setDrifLevels(prev => ({ ...prev, [index]: parseInt("") }));
                                    }}
                                    disabled={!currentType}
                                    className={`flex-[3] min-w-0 bg-transparent text-stone-300 font-serif p-1 text-xs border-b border-stone-800 focus:border-rose-900 outline-none text-center disabled:opacity-30 cursor-pointer ${isOverCapacity ? 'border-rose-900/50' : 'border-stone-800'}`}
                                >
                                    <option value="" className="bg-stone-950 text-stone-500">Wymiar...</option>
                                    {currentType && currentGroupedDrifs[currentType]?.map((d) => {
                                        const basePwr = drifBasePowers[d.bonusType] || 0;
                                        const minPwr = basePwr * 1;
                                        const maxPwr = basePwr * (DRIF_MULTIPLIERS[d.size?.toUpperCase()] || 1);
                                        const labelPwr = minPwr === maxPwr ? `${minPwr}p` : `${minPwr}-${maxPwr}p`;

                                        return (
                                            <option key={d.id} value={d.id} className="bg-stone-950 text-stone-300">
                                                {d.size || d.tier} ({labelPwr})
                                            </option>
                                        )
                                    })}
                                </select>

                                <select
                                    value={drifLevels[index] || ""}
                                    onChange={(e) => setDrifLevels(prev => ({ ...prev, [index]: parseInt(e.target.value) }))}
                                    disabled={!drifId}
                                    className={`flex-[2] min-w-0 bg-transparent text-stone-300 font-serif p-1 text-xs border-b border-stone-800 focus:border-rose-900 outline-none text-center disabled:opacity-30 cursor-pointer ${isOverCapacity ? 'border-rose-900/50' : 'border-stone-800'}`}
                                >
                                    <option value="" className="bg-stone-950 text-stone-500">lvl...</option>
                                    {Array.from({ length: maxLvl }, (_, i) => i + 1).map(num => {
                                        const wouldCost = basePwrForCurrent * getEffectiveMultiplier(num);
                                        const wouldExceedCapacity = powerWithoutThisDrif + wouldCost > itemCapacity;

                                        return (
                                            <option
                                                key={num}
                                                value={num.toString()}
                                                disabled={wouldExceedCapacity}
                                                className={`bg-stone-950 ${wouldExceedCapacity ? 'text-stone-700' : 'text-stone-300'}`}
                                            >
                                                {num}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                        );
                    })}

                    {!fullSelectedItem && (
                        <span className="text-[10px] font-serif text-stone-600 uppercase tracking-widest mt-1 pointer-events-none drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">Oczekiwanie...</span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GearSlot;