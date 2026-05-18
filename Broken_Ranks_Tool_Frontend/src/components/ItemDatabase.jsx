import { useState, useMemo } from "react";

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

const ItemDatabase = ({ groupedItems }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("Wszystkie");
    const [selectedTier, setSelectedTier] = useState("Wszystkie");
    const [selectedStat, setSelectedStat] = useState("Wszystkie");

    const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, item: null });

    const { allCategories, allTiers, allStats } = useMemo(() => {
        const tiersSet = new Set();
        const statsSet = new Set();

        Object.values(groupedItems).flat().forEach(item => {
            if (item.tier) tiersSet.add(item.tier);
            if (item.stats) {
                Object.keys(item.stats).forEach(stat => statsSet.add(stat));
            }
        });

        const romanToInt = { I:1, II:2, III:3, IV:4, V:5, VI:6, VII:7, VIII:8, IX:9, X:10, XI:11, XII:12 };

        return {
            allCategories: ["Wszystkie", ...Object.keys(groupedItems).sort()],
            allTiers: ["Wszystkie", ...Array.from(tiersSet).sort((a, b) => (romanToInt[a] || 99) - (romanToInt[b] || 99))],
            allStats: ["Wszystkie", ...Array.from(statsSet).sort()]
        };
    }, [groupedItems]);

    const filteredGroups = Object.entries(groupedItems).reduce((acc, [category, items]) => {
        if (selectedCategory !== "Wszystkie" && category !== selectedCategory) return acc;

        const matchedItems = items.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesTier = selectedTier === "Wszystkie" || item.tier === selectedTier;
            const matchesStat = selectedStat === "Wszystkie" || (item.stats && item.stats[selectedStat] !== undefined);

            return matchesSearch && matchesTier && matchesStat;
        });

        if (matchedItems.length > 0) acc[category] = matchedItems;
        return acc;
    }, {});

    const handleDragStart = (e, item) => {
        e.dataTransfer.setData("application/json", JSON.stringify(item));
    };

    const handleMouseMove = (e, item) => {
        setTooltip({ show: true, x: e.clientX + 15, y: e.clientY + 15, item });
    };

    const handleMouseLeave = () => {
        setTooltip({ show: false, x: 0, y: 0, item: null });
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
                <h3 className="text-xl font-bold text-white">
                    Baza Przedmiotów
                </h3>
                {(searchTerm || selectedCategory !== "Wszystkie" || selectedTier !== "Wszystkie" || selectedStat !== "Wszystkie") && (
                    <button
                        onClick={clearFilters}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors font-bold uppercase tracking-wider"
                    >
                        Wyczyść filtry
                    </button>
                )}
            </div>

            <div className="shrink-0 mb-4 flex flex-col gap-2">
                <input
                    type="text"
                    placeholder="Wyszukaj (np. Morana)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-neutral-900 text-white p-2 text-sm rounded border border-neutral-600 focus:border-blue-500 outline-none transition-colors"
                />

                <div className="flex gap-2">
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="flex-1 min-w-0 bg-neutral-900 text-gray-300 p-2 text-xs rounded border border-neutral-600 focus:border-blue-500 outline-none cursor-pointer"
                        title="Kategoria sprzętu"
                    >
                        {allCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>

                    <select
                        value={selectedTier}
                        onChange={(e) => setSelectedTier(e.target.value)}
                        className="flex-1 min-w-0 bg-neutral-900 text-orange-300 p-2 text-xs rounded border border-neutral-600 focus:border-blue-500 outline-none cursor-pointer font-bold"
                        title="Ranga (Tier)"
                    >
                        {allTiers.map(tier => <option key={tier} value={tier}>{tier === "Wszystkie" ? "Tier..." : `Tier ${tier}`}</option>)}
                    </select>

                    <select
                        value={selectedStat}
                        onChange={(e) => setSelectedStat(e.target.value)}
                        className="flex-1 min-w-0 bg-neutral-900 text-yellow-300 p-2 text-xs rounded border border-neutral-600 focus:border-blue-500 outline-none cursor-pointer"
                        title="Zawiera statystykę"
                    >
                        {allStats.map(stat => <option key={stat} value={stat}>{stat === "Wszystkie" ? "Staty..." : stat}</option>)}
                    </select>
                </div>
            </div>

            <div className="overflow-y-auto pr-2 space-y-4 flex-1">
                {Object.entries(filteredGroups).sort().map(([category, catItems]) => (
                    <div key={category}>
                        <h4 className="text-blue-400 font-bold mb-1 text-sm">{category}</h4>
                        <ul className="text-sm space-y-1 pl-2 border-l-2 border-neutral-700">
                            {catItems.map(item => (
                                <li
                                    key={item.id}
                                    draggable="true"
                                    onDragStart={(e) => handleDragStart(e, item)}
                                    onMouseMove={(e) => handleMouseMove(e, item)}
                                    onMouseLeave={handleMouseLeave}
                                    className="hover:bg-neutral-700/50 p-1 rounded transition-colors cursor-grab active:cursor-grabbing flex justify-between items-center group"
                                >
                                    <span className={`truncate mr-2 ${getRarityColor(item.rarity)}`}>{item.name}</span>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {item.tier && <span className="text-[10px] text-orange-400 font-bold border border-orange-500/30 px-1 rounded bg-orange-900/20">{item.tier}</span>}
                                        <span className="text-gray-500 text-[11px] group-hover:text-gray-300 transition-colors w-10 text-right">
                                            Lvl {item.reqLevel || "?"}
                                        </span>
                                    </div>
                                </li>
                            ))}
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
                        <h4 className={`text-base ${getRarityColor(tooltip.item.rarity)}`}>{tooltip.item.name}</h4>
                        {tooltip.item.tier && <span className="text-xs text-orange-500 font-bold mt-1">{tooltip.item.tier}</span>}
                    </div>
                    {tooltip.item.stats && Object.keys(tooltip.item.stats).length > 0 ? (
                        Object.entries(tooltip.item.stats).map(([k, v]) => (
                            <div key={k} className="flex justify-between text-xs my-1">
                                <span className="text-gray-300">{k}</span>
                                <span className="text-yellow-400 font-bold">+{v}</span>
                            </div>
                        ))
                    ) : (
                        <p className="text-xs text-gray-500 italic">Brak statystyk bazowych.</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default ItemDatabase;