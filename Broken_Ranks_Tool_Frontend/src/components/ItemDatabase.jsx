import { useState, useMemo } from "react";
import { ROMAN_ORDER, SIZE_ORDER} from  "../utils/GearRules.jsx"

const getRarityColor = (rarity) => {
    if (!rarity) return "bg-clip-text text-transparent bg-gradient-to-r from-stone-400 to-stone-500 font-bold";
    switch(rarity.toUpperCase()) {
        case 'SET': return "bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-green-600 font-bold";
        case 'EPIC': return "bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-purple-600 font-bold";
        case 'LEGENDARY': return "bg-clip-text text-transparent bg-gradient-to-r from-amber-300 to-amber-600 font-bold";
        case 'RARE': return "bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-600 font-bold";
        default: return "bg-clip-text text-transparent bg-gradient-to-r from-stone-400 to-stone-500 font-bold";
    }
};

const deduplicateVariants = (variants) => {
    const seen = new Set();
    return variants.filter(v => {
        const key = v.size || v.tier;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

const sortVariants = (variants) => {
    return variants.sort((a, b) => {
        const valA = a.size || a.tier || "";
        const valB = b.size || b.tier || "";
        const orderA = SIZE_ORDER[valA.toUpperCase()] || ROMAN_ORDER[valA.toUpperCase()] || 99;
        const orderB = SIZE_ORDER[valB.toUpperCase()] || ROMAN_ORDER[valB.toUpperCase()] || 99;
        return orderA - orderB;
    });
};

const getShortLabel = (variant) => {
    const val = variant.size || variant.tier || "";
    const up = val.toUpperCase();
    if (up === "SUBDRIF") return "S";
    if (up === "BIDRIF") return "B";
    if (up === "MAGNIDRIF") return "M";
    if (up === "ARCYDRIF") return "A";
    if (up.length <= 3) return up;
    return up.substring(0, 1);
};

const calculateDoubleIncrement = (incrementStr) => {
    if (!incrementStr) return "?";
    const hasPlus = incrementStr.includes('+');
    const cleanStr = incrementStr.replace(/\+/g, '').trim();
    const parsed = parseFloat(cleanStr.replace(',', '.'));
    if (isNaN(parsed)) return "?";
    const isPercentage = cleanStr.includes('%');
    let val = (parsed * 2).toString().replace('.', ',');
    if (isPercentage && !val.includes('%')) val += '%';
    return (hasPlus ? '+' : '') + val;
};

const ItemDatabase = ({ items = [], orbs = [], drifs = [], categoryNames = {}, gameRules = {} }) => {
    const [activeTab, setActiveTab] = useState("items");
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("Wszystkie");
    const [selectedTier, setSelectedTier] = useState("Wszystkie");
    const [selectedStat, setSelectedStat] = useState("Wszystkie");

    const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, item: null, type: 'item' });

    const { bonusTranslations = {}, drifBasePowers = {} } = gameRules;

    const { groupedData, allCategories, allTiers, allStats } = useMemo(() => {
        let groups = {};
        const tiersSet = new Set();
        const statsSet = new Set();

        if (activeTab === "items") {
            items.forEach(item => {
                const cat = categoryNames[item.category] || item.category || "INNE";
                if (!groups[cat]) groups[cat] = [];
                groups[cat].push(item);

                if (item.tier) tiersSet.add(item.tier);
                if (item.stats) Object.keys(item.stats).forEach(s => statsSet.add(s));
            });
        } else if (activeTab === "orbs") {
            const orbsByType = {};
            orbs.forEach(orb => {
                if (!orbsByType[orb.bonusType]) orbsByType[orb.bonusType] = [];
                orbsByType[orb.bonusType].push(orb);
                if (orb.tier || orb.size) tiersSet.add(orb.tier || orb.size);
            });
            groups["Orby"] = Object.values(orbsByType).map(v => sortVariants(deduplicateVariants(v)));
        } else if (activeTab === "drifs") {
            const drifsByType = {};
            drifs.forEach(drif => {
                if (!drifsByType[drif.bonusType]) drifsByType[drif.bonusType] = [];
                drifsByType[drif.bonusType].push(drif);
                if (drif.size) tiersSet.add(drif.size);
            });
            groups["Drify"] = Object.values(drifsByType).map(v => sortVariants(deduplicateVariants(v)));
        }

        return {
            groupedData: groups,
            allCategories: ["Wszystkie", ...Object.keys(groups).sort()],
            allTiers: ["Wszystkie", ...Array.from(tiersSet).sort((a, b) => (ROMAN_ORDER[a] || 99) - (ROMAN_ORDER[b] || 99))],
            allStats: ["Wszystkie", ...Array.from(statsSet).sort()]
        };
    }, [items, orbs, drifs, activeTab, categoryNames]);

    const filteredGroups = Object.entries(groupedData).reduce((acc, [category, itemList]) => {
        if (activeTab === "items" && selectedCategory !== "Wszystkie" && category !== selectedCategory) return acc;

        const matchedItems = itemList.filter(itemOrVariants => {
            if (activeTab === "items") {
                const searchStr = (itemOrVariants.name || "").toLowerCase();
                const matchesSearch = searchStr.includes(searchTerm.toLowerCase());
                const matchesTier = selectedTier === "Wszystkie" || itemOrVariants.tier === selectedTier;
                const matchesStat = selectedStat === "Wszystkie" || (itemOrVariants.stats && itemOrVariants.stats[selectedStat] !== undefined);
                return matchesSearch && matchesTier && matchesStat;
            } else {
                const baseItem = itemOrVariants[0];
                const translatedName = bonusTranslations[baseItem.bonusType] || baseItem.bonusType || "";
                const matchesSearch = (baseItem.name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
                    translatedName.toLowerCase().includes(searchTerm.toLowerCase());
                const hasMatchingTier = selectedTier === "Wszystkie" || itemOrVariants.some(v => (v.tier || v.size) === selectedTier);
                return matchesSearch && hasMatchingTier;
            }
        });

        if (matchedItems.length > 0) acc[category] = matchedItems;
        return acc;
    }, {});

    const handleDragStart = (e, item, type) => {
        e.dataTransfer.setData("application/json", JSON.stringify({ ...item, dragType: type }));
    };

    const handleMouseMove = (e, item, type) => {
        setTooltip({ show: true, x: e.clientX + 15, y: e.clientY + 15, item, type });
    };

    const handleMouseLeave = () => {
        setTooltip({ show: false, x: 0, y: 0, item: null, type: 'item' });
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setSearchTerm("");
        setSelectedCategory("Wszystkie");
        setSelectedTier("Wszystkie");
        setSelectedStat("Wszystkie");
    };

    const clearFilters = () => {
        setSearchTerm("");
        setSelectedCategory("Wszystkie");
        setSelectedTier("Wszystkie");
        setSelectedStat("Wszystkie");
    };

    return (
        <div className="bg-gradient-to-b from-stone-900 to-black p-6 border-2 border-stone-800 shadow-[0_0_30px_rgba(0,0,0,0.9)] flex flex-col h-full relative">
            <div className="flex justify-between items-end border-b-4 border-double border-rose-900/70 pb-3 mb-4 shrink-0">
                <h3 className="text-xl font-serif font-bold text-stone-300 uppercase tracking-widest drop-shadow-[0_2px_5px_rgba(0,0,0,1)]">Baza Danych</h3>
                {(searchTerm || selectedCategory !== "Wszystkie" || selectedTier !== "Wszystkie" || selectedStat !== "Wszystkie") && (
                    <button onClick={clearFilters} className="text-xs text-rose-800 hover:text-rose-600 transition-colors font-serif font-bold uppercase tracking-widest">
                        Wyczyść filtry
                    </button>
                )}
            </div>

            <div className="flex bg-black/60 p-1 mb-4 shrink-0 border border-stone-800 shadow-[inset_0_0_10px_rgba(0,0,0,1)]">
                {["items", "orbs", "drifs"].map(tab => {
                    const isActive = activeTab === tab;
                    const baseBtn = "flex-1 py-2 text-xs font-serif font-bold uppercase tracking-widest transition-all";
                    const bgClass = isActive
                        ? (tab === "items" ? "bg-stone-800 border-b-2 border-stone-400"
                            : tab === "orbs" ? "bg-rose-950/40 border-b-2 border-rose-800"
                                : "bg-amber-950/40 border-b-2 border-orange-700")
                        : "hover:bg-stone-900/50 border-b-2 border-transparent";
                    const textClass = isActive
                        ? (tab === "items" ? "bg-clip-text text-transparent bg-gradient-to-r from-stone-200 to-stone-400"
                            : tab === "orbs" ? "bg-clip-text text-transparent bg-gradient-to-r from-red-400 to-rose-600"
                                : "bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-amber-600")
                        : "text-stone-500 hover:text-stone-300";

                    return (
                        <button key={tab} onClick={() => handleTabChange(tab)} className={`${baseBtn} ${bgClass}`}>
                            <span className={textClass}>
                                {tab === "items" ? "Przedmioty" : tab === "orbs" ? "Orby" : "Drify"}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="shrink-0 mb-4 flex flex-col gap-2">
                <input
                    type="text"
                    placeholder={`Wyszukaj ${activeTab === "items" ? "(np. Morana)" : activeTab === "orbs" ? "orba" : "drifa"}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-black/60 text-stone-300 font-serif p-2 text-sm border border-stone-800 focus:border-rose-900 outline-none transition-colors shadow-[inset_0_0_10px_rgba(0,0,0,1)]"
                />

                <div className="flex gap-2">
                    {activeTab === "items" && (
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="flex-1 min-w-0 bg-black/60 text-stone-400 font-serif p-2 text-xs border border-stone-800 focus:border-rose-900 outline-none cursor-pointer shadow-[inset_0_0_10px_rgba(0,0,0,1)]"
                        >
                            {allCategories.map(cat => <option key={cat} value={cat} className="bg-stone-900 text-stone-300">{cat}</option>)}
                        </select>
                    )}

                    <select
                        value={selectedTier}
                        onChange={(e) => setSelectedTier(e.target.value)}
                        className="flex-1 min-w-0 bg-black/60 text-stone-400 font-serif font-bold uppercase tracking-wider p-2 text-xs border border-stone-800 focus:border-rose-900 outline-none cursor-pointer shadow-[inset_0_0_10px_rgba(0,0,0,1)]"
                    >
                        {allTiers.map(tier => <option key={tier} value={tier} className="bg-stone-900 text-stone-300">{tier === "Wszystkie" ? (activeTab === "items" ? "Tier..." : "Wielkość...") : tier}</option>)}
                    </select>

                    {activeTab === "items" && (
                        <select
                            value={selectedStat}
                            onChange={(e) => setSelectedStat(e.target.value)}
                            className="flex-1 min-w-0 bg-black/60 text-stone-400 font-serif p-2 text-xs border border-stone-800 focus:border-rose-900 outline-none cursor-pointer shadow-[inset_0_0_10px_rgba(0,0,0,1)]"
                        >
                            {allStats.map(stat => <option key={stat} value={stat} className="bg-stone-900 text-stone-300">{stat === "Wszystkie" ? "Staty..." : stat}</option>)}
                        </select>
                    )}
                </div>
            </div>

            <div className="overflow-y-auto pr-2 space-y-4 flex-1 custom-scrollbar">
                {Object.entries(filteredGroups).sort().map(([category, catItems]) => (
                    <div key={category}>
                        <h4 className="text-stone-500 font-serif font-bold mb-2 text-xs uppercase tracking-[0.2em]">{category}</h4>
                        <ul className="text-sm space-y-1 pl-2 border-l border-stone-800">
                            {catItems.map((itemData, idx) => {
                                if (activeTab === "items") {
                                    return (
                                        <li
                                            key={itemData.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, itemData, "items")}
                                            onMouseMove={(e) => handleMouseMove(e, itemData, "items")}
                                            onMouseLeave={handleMouseLeave}
                                            className="p-1.5 transition-colors flex justify-between items-center group cursor-grab active:cursor-grabbing hover:bg-stone-900/50 border-b border-stone-800/50"
                                        >
                                            <span className={`truncate mr-2 font-serif ${getRarityColor(itemData.rarity)}`}>
                                                {itemData.name || itemData.description || itemData.bonusType}
                                            </span>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {itemData.tier && <span className="text-[10px] text-stone-400 font-serif font-bold border border-stone-800/50 px-1.5 py-0.5 bg-black">{itemData.tier}</span>}
                                                <span className="text-stone-600 font-serif text-[11px] group-hover:text-stone-400 transition-colors w-10 text-right">
                                                    Lvl {itemData.reqLevel || "?"}
                                                </span>
                                            </div>
                                        </li>
                                    );
                                } else {
                                    const baseItem = itemData[0];
                                    const translatedName = bonusTranslations[baseItem.bonusType] || baseItem.bonusType || "";

                                    return (
                                        <li
                                            key={idx}
                                            className="p-1.5 flex justify-between items-center gap-2 hover:bg-stone-900/50 transition-colors border-b border-stone-800/50"
                                        >
                                            <span
                                                className="truncate flex-1 cursor-help flex items-center gap-1.5"
                                                onMouseMove={(e) => handleMouseMove(e, baseItem, activeTab)}
                                                onMouseLeave={handleMouseLeave}
                                            >
                                                {baseItem.name && <span className={`font-serif font-bold bg-clip-text text-transparent bg-gradient-to-r ${activeTab === 'orbs' ? 'from-red-400 to-rose-600' : 'from-orange-400 to-amber-600'}`}>{baseItem.name}</span>}
                                                <span className="text-stone-400 font-serif text-xs">{translatedName}</span>
                                            </span>
                                            <div className="flex gap-1 shrink-0">
                                                {itemData.map(variant => (
                                                    <div
                                                        key={variant.id}
                                                        draggable
                                                        onDragStart={(e) => handleDragStart(e, variant, activeTab)}
                                                        onMouseMove={(e) => handleMouseMove(e, variant, activeTab)}
                                                        onMouseLeave={handleMouseLeave}
                                                        className={`w-7 h-7 flex items-center justify-center font-serif text-[12px] font-bold cursor-grab active:cursor-grabbing transition-colors shadow-inner border 
                                                            ${activeTab === 'orbs'
                                                            ? 'bg-black text-rose-700 border-rose-900/50 hover:bg-rose-950/40 hover:text-red-500 hover:border-rose-700'
                                                            : 'bg-black text-orange-600 border-orange-900/50 hover:bg-amber-950/30 hover:text-amber-500 hover:border-orange-500'}`}
                                                        title={variant.size || variant.tier}
                                                    >
                                                        {getShortLabel(variant)}
                                                    </div>
                                                ))}
                                            </div>
                                        </li>
                                    );
                                }
                            })}
                        </ul>
                    </div>
                ))}

                {Object.keys(filteredGroups).length === 0 && (
                    <div className="text-center mt-10">
                        <p className="text-stone-600 font-serif italic text-sm mb-2">Brak wyników spełniających kryteria.</p>
                        <button onClick={clearFilters} className="text-rose-800 hover:text-rose-600 text-sm font-serif border border-stone-700 px-3 py-1 bg-black/60 shadow-inner">
                            Zresetuj filtry
                        </button>
                    </div>
                )}
            </div>

            {tooltip.show && tooltip.item && (
                <div
                    style={{ top: tooltip.y, left: tooltip.x }}
                    className="fixed z-50 bg-gradient-to-b from-stone-900 to-black border border-stone-700 p-4 shadow-[0_0_20px_rgba(0,0,0,1)] pointer-events-none w-64"
                >
                    <div className="flex justify-between items-start border-b-2 border-double border-rose-900/50 pb-2 mb-2">
                        <h4 className={`text-base font-serif tracking-wide ${tooltip.type === 'items' ? getRarityColor(tooltip.item.rarity) : `font-bold bg-clip-text text-transparent bg-gradient-to-r ${tooltip.type === 'orbs' ? 'from-red-400 to-rose-600' : 'from-orange-400 to-amber-600'}`}`}>
                            {tooltip.type === 'items' ? tooltip.item.name : (
                                <div className="flex flex-col">
                                    {tooltip.item.name && <span>{tooltip.item.name}</span>}
                                    <span className="text-stone-400 text-xs font-normal">{bonusTranslations[tooltip.item.bonusType] || tooltip.item.bonusType}</span>
                                </div>
                            )}
                        </h4>
                        {(tooltip.item.tier || tooltip.item.size) && <span className={`text-xs font-serif font-bold mt-1 ml-2 ${tooltip.type === 'orbs' ? 'text-rose-800' : 'text-orange-600'}`}>{tooltip.item.tier || tooltip.item.size}</span>}
                    </div>

                    {tooltip.type === "items" && (
                        tooltip.item.stats && Object.keys(tooltip.item.stats).length > 0 ? (
                            Object.entries(tooltip.item.stats).map(([k, v]) => (
                                <div key={k} className="flex justify-between text-xs my-1 border-b border-stone-800/50 pb-1">
                                    <span className="text-stone-400 font-serif uppercase tracking-wider">{k}</span>
                                    <span className="text-stone-300 font-bold font-serif">+{v}</span>
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-stone-600 font-serif italic mt-2">Brak statystyk bazowych.</p>
                        )
                    )}

                    {tooltip.type === "drifs" && (
                        <div className="flex flex-col gap-1.5 text-xs font-serif mt-2">
                            <div className="flex justify-between border-b border-stone-800/50 pb-1">
                                <span className="text-stone-500">Wartość bazowa:</span>
                                <span className="text-stone-300 font-bold">{tooltip.item.baseValue || "?"}</span>
                            </div>
                            <div className="flex justify-between border-b border-stone-800/50 pb-1">
                                <span className="text-stone-500">Przyrost co lvl:</span>
                                <span className="text-orange-500 font-bold">{tooltip.item.increment || "?"}</span>
                            </div>
                            <div className="text-[10px] text-orange-600/70 italic mb-2 text-right">
                                Arcydrif (19-21 lvl): przyrost x2 ({calculateDoubleIncrement(tooltip.item.increment)})
                            </div>
                            <div className="flex justify-between mb-2 pb-1 border-b-2 border-double border-rose-900/30">
                                <span className="text-stone-500">Potęga bazowa:</span>
                                <span className="text-orange-400 font-bold">{drifBasePowers[tooltip.item.bonusType] || "?"} pkt</span>
                            </div>
                            <div className="text-stone-600 font-bold mb-1 uppercase tracking-widest text-[10px]">Mnożniki pojemności:</div>
                            <div className="flex justify-between text-stone-400"><span>Subdrif (Lvl 1-6):</span> <span className="text-stone-300">x1</span></div>
                            <div className="flex justify-between text-stone-400"><span>Bidrif (Lvl 7-11):</span> <span className="text-stone-300">x2</span></div>
                            <div className="flex justify-between text-stone-400"><span>Magnidrif (Lvl 12-16):</span> <span className="text-stone-300">x3</span></div>
                            <div className="flex justify-between text-stone-400"><span>Arcydrif (Lvl 17-21):</span> <span className="text-orange-500">x4</span></div>
                        </div>
                    )}

                    {tooltip.type === "orbs" && (
                        <div className="flex flex-col gap-1.5 text-xs font-serif mt-2">
                            <div className="flex justify-between border-b border-stone-800/50 pb-1">
                                <span className="text-stone-500">Bonus Lvl 1:</span>
                                <span className="text-rose-700 font-bold">{tooltip.item.bonusLvl1 || "?"}</span>
                            </div>
                            <div className="flex justify-between border-b border-stone-800/50 pb-1">
                                <span className="text-stone-500">Bonus Lvl 2:</span>
                                <span className="text-rose-600 font-bold">{tooltip.item.bonusLvl2 || "?"}</span>
                            </div>
                            <div className="flex justify-between mb-2 pb-2 border-b-2 border-double border-rose-900/30">
                                <span className="text-stone-500">Bonus Lvl 3:</span>
                                <span className="text-rose-500 font-bold">{tooltip.item.bonusLvl3 || "?"}</span>
                            </div>
                            <div className="text-[10px] text-stone-600 italic text-center mt-1">
                                Przeciągnij kwadracik bezpośrednio na okienko z przedmiotem.
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ItemDatabase;