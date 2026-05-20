import { useState, useMemo } from "react";
import { ROMAN_ORDER, SIZE_ORDER} from  "../utils/GearRules.jsx"

const getRarityColor = (rarity) => {
    if (!rarity) return "text-gray-300";
    switch(rarity.toUpperCase()) {
        case 'SET': return "text-green-400 font-bold";
        case 'EPIC': return "text-purple-400 font-bold";
        case 'LEGENDARY': return "text-orange-400 font-bold";
        case 'RARE': return "text-blue-300 font-bold";
        default: return "text-gray-300";
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
        <div className="bg-neutral-800 p-6 rounded-xl shadow-lg border border-neutral-700 flex flex-col h-full relative">
            <div className="flex justify-between items-end border-b-2 border-blue-600 pb-3 mb-4 shrink-0">
                <h3 className="text-xl font-bold text-white">Baza Danych</h3>
                {(searchTerm || selectedCategory !== "Wszystkie" || selectedTier !== "Wszystkie" || selectedStat !== "Wszystkie") && (
                    <button onClick={clearFilters} className="text-xs text-red-400 hover:text-red-300 transition-colors font-bold uppercase tracking-wider">
                        Wyczyść filtry
                    </button>
                )}
            </div>

            <div className="flex bg-neutral-900 rounded-lg p-1 mb-4 shrink-0 border border-neutral-700">
                {["items", "orbs", "drifs"].map(tab => (
                    <button
                        key={tab}
                        onClick={() => handleTabChange(tab)}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === tab ? (tab==="items"?"bg-blue-600":tab==="orbs"?"bg-red-600":"bg-orange-600") + " text-white" : "text-gray-400 hover:text-white hover:bg-neutral-800"}`}
                    >
                        {tab === "items" ? "Przedmioty" : tab === "orbs" ? "Orby" : "Drify"}
                    </button>
                ))}
            </div>

            <div className="shrink-0 mb-4 flex flex-col gap-2">
                <input
                    type="text"
                    placeholder={`Wyszukaj ${activeTab === "items" ? "(np. Morana)" : activeTab === "orbs" ? "orba" : "drifa"}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-neutral-900 text-white p-2 text-sm rounded border border-neutral-600 focus:border-blue-500 outline-none transition-colors"
                />

                <div className="flex gap-2">
                    {activeTab === "items" && (
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="flex-1 min-w-0 bg-neutral-900 text-gray-300 p-2 text-xs rounded border border-neutral-600 focus:border-blue-500 outline-none cursor-pointer"
                        >
                            {allCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    )}

                    <select
                        value={selectedTier}
                        onChange={(e) => setSelectedTier(e.target.value)}
                        className="flex-1 min-w-0 bg-neutral-900 text-orange-300 p-2 text-xs rounded border border-neutral-600 focus:border-blue-500 outline-none cursor-pointer font-bold"
                    >
                        {allTiers.map(tier => <option key={tier} value={tier}>{tier === "Wszystkie" ? (activeTab === "items" ? "Tier..." : "Wielkość...") : tier}</option>)}
                    </select>

                    {activeTab === "items" && (
                        <select
                            value={selectedStat}
                            onChange={(e) => setSelectedStat(e.target.value)}
                            className="flex-1 min-w-0 bg-neutral-900 text-yellow-300 p-2 text-xs rounded border border-neutral-600 focus:border-blue-500 outline-none cursor-pointer"
                        >
                            {allStats.map(stat => <option key={stat} value={stat}>{stat === "Wszystkie" ? "Staty..." : stat}</option>)}
                        </select>
                    )}
                </div>
            </div>

            <div className="overflow-y-auto pr-2 space-y-4 flex-1">
                {Object.entries(filteredGroups).sort().map(([category, catItems]) => (
                    <div key={category}>
                        <h4 className="text-blue-400 font-bold mb-1 text-sm">{category}</h4>
                        <ul className="text-sm space-y-1 pl-2 border-l-2 border-neutral-700">
                            {catItems.map((itemData, idx) => {
                                if (activeTab === "items") {
                                    return (
                                        <li
                                            key={itemData.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, itemData, "items")}
                                            onMouseMove={(e) => handleMouseMove(e, itemData, "items")}
                                            onMouseLeave={handleMouseLeave}
                                            className="p-1 rounded transition-colors flex justify-between items-center group cursor-grab active:cursor-grabbing hover:bg-neutral-700/50"
                                        >
                                            <span className={`truncate mr-2 ${getRarityColor(itemData.rarity)}`}>
                                                {itemData.name || itemData.description || itemData.bonusType}
                                            </span>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {itemData.tier && <span className="text-[10px] text-orange-400 font-bold border border-orange-500/30 px-1 rounded bg-orange-900/20">{itemData.tier}</span>}
                                                <span className="text-gray-500 text-[11px] group-hover:text-gray-300 transition-colors w-10 text-right">
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
                                            className="p-1 rounded flex justify-between items-center gap-2 hover:bg-neutral-800 transition-colors"
                                        >
                                            <span
                                                className="truncate flex-1 cursor-help flex items-center gap-1.5"
                                                onMouseMove={(e) => handleMouseMove(e, baseItem, activeTab)}
                                                onMouseLeave={handleMouseLeave}
                                            >
                                                {baseItem.name && <span className="text-orange-400 font-bold">{baseItem.name}</span>}
                                                <span className="text-gray-300">{translatedName}</span>
                                            </span>
                                            <div className="flex gap-1 shrink-0">
                                                {itemData.map(variant => (
                                                    <div
                                                        key={variant.id}
                                                        draggable
                                                        onDragStart={(e) => handleDragStart(e, variant, activeTab)}
                                                        onMouseMove={(e) => handleMouseMove(e, variant, activeTab)}
                                                        onMouseLeave={handleMouseLeave}
                                                        className={`w-6 h-6 flex items-center justify-center bg-neutral-700 text-white text-[10px] font-bold rounded cursor-grab active:cursor-grabbing border border-neutral-600 transition-colors ${activeTab === 'orbs' ? 'hover:bg-red-600 hover:border-red-400' : 'hover:bg-orange-500 hover:border-orange-400'}`}
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
                        <p className="text-gray-500 text-sm mb-2">Brak wyników spełniających kryteria.</p>
                        <button onClick={clearFilters} className="text-blue-400 hover:text-blue-300 text-sm border border-blue-500 px-3 py-1 rounded">
                            Zresetuj filtry
                        </button>
                    </div>
                )}
            </div>

            {tooltip.show && tooltip.item && (
                <div
                    style={{ top: tooltip.y, left: tooltip.x }}
                    className="fixed z-50 bg-neutral-900 border-2 border-blue-600 p-3 rounded-lg shadow-2xl text-white pointer-events-none w-64"
                >
                    <div className="flex justify-between items-start border-b border-gray-700 pb-1 mb-2">
                        <h4 className={`text-base ${tooltip.type === 'items' ? getRarityColor(tooltip.item.rarity) : 'font-bold'}`}>
                            {tooltip.type === 'items' ? tooltip.item.name : (
                                <div className="flex flex-col">
                                    {tooltip.item.name && <span className="text-orange-400">{tooltip.item.name}</span>}
                                    <span className="text-gray-400 text-xs font-normal">{bonusTranslations[tooltip.item.bonusType] || tooltip.item.bonusType}</span>
                                </div>
                            )}
                        </h4>
                        {(tooltip.item.tier || tooltip.item.size) && <span className="text-xs text-orange-500 font-bold mt-1 ml-2">{tooltip.item.tier || tooltip.item.size}</span>}
                    </div>

                    {tooltip.type === "items" && (
                        tooltip.item.stats && Object.keys(tooltip.item.stats).length > 0 ? (
                            Object.entries(tooltip.item.stats).map(([k, v]) => (
                                <div key={k} className="flex justify-between text-xs my-1">
                                    <span className="text-gray-300">{k}</span>
                                    <span className="text-yellow-400 font-bold">+{v}</span>
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-gray-500 italic">Brak statystyk bazowych.</p>
                        )
                    )}

                    {tooltip.type === "drifs" && (
                        <div className="flex flex-col gap-1 text-xs">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Wartość bazowa:</span>
                                <span className="text-white font-bold">{tooltip.item.baseValue || "?"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Przyrost co lvl:</span>
                                <span className="text-green-400 font-bold">{tooltip.item.increment || "?"}</span>
                            </div>
                            <div className="text-[10px] text-orange-400 italic mb-2 text-right">
                                * Arcydrif (19-21 lvl): przyrost x2 ({calculateDoubleIncrement(tooltip.item.increment)})
                            </div>
                            <div className="flex justify-between mb-2 pb-1 border-b border-neutral-700">
                                <span className="text-gray-400">Potęga bazowa:</span>
                                <span className="text-yellow-400 font-bold">{drifBasePowers[tooltip.item.bonusType] || "?"} pkt</span>
                            </div>
                            <div className="text-gray-500 font-bold mb-1">Mnożniki pojemności:</div>
                            <div className="flex justify-between text-gray-300"><span>Subdrif (Lvl 1-6):</span> <span className="text-white">x1</span></div>
                            <div className="flex justify-between text-gray-300"><span>Bidrif (Lvl 7-11):</span> <span className="text-white">x2</span></div>
                            <div className="flex justify-between text-gray-300"><span>Magnidrif (Lvl 12-16):</span> <span className="text-white">x3</span></div>
                            <div className="flex justify-between text-gray-300"><span>Arcydrif (Lvl 17-21):</span> <span className="text-orange-400">x4</span></div>
                        </div>
                    )}

                    {tooltip.type === "orbs" && (
                        <div className="flex flex-col gap-1 text-xs mt-1">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Bonus Lvl 1:</span>
                                <span className="text-white font-bold">{tooltip.item.bonusLvl1 || "?"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Bonus Lvl 2:</span>
                                <span className="text-white font-bold">{tooltip.item.bonusLvl2 || "?"}</span>
                            </div>
                            <div className="flex justify-between mb-2 pb-1 border-b border-neutral-700">
                                <span className="text-gray-400">Bonus Lvl 3:</span>
                                <span className="text-white font-bold">{tooltip.item.bonusLvl3 || "?"}</span>
                            </div>
                            <div className="text-xs text-gray-400 italic">
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