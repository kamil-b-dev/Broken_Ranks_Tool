const TAB_LABELS = { items: "Przedmioty", orbs: "Orby", drifs: "Drify" };

const selectClass =
    "flex-1 min-w-0 bg-black/60 text-stone-400 font-serif p-2 text-xs border border-stone-800 focus:border-rose-900 outline-none cursor-pointer shadow-[inset_0_0_10px_rgba(0,0,0,1)]";

const ItemDatabaseControls = ({
    activeTab,
    filters,
    hasActiveFilters,
    allCategories,
    allTiers,
    allStats,
    orbCategories,
    drifCategories,
    onTabChange,
    onFilterChange,
    onClearFilters,
}) => (
    <>
        <div className="flex justify-between items-end border-b-4 border-double border-rose-900/70 pb-3 mb-4 shrink-0">
            <h3 className="text-xl font-serif font-bold text-stone-300 uppercase tracking-widest drop-shadow-[0_2px_5px_rgba(0,0,0,1)]">
                Baza Danych
            </h3>
            {hasActiveFilters && (
                <button
                    type="button"
                    onClick={onClearFilters}
                    className="text-xs text-rose-800 hover:text-rose-600 transition-colors font-serif font-bold uppercase tracking-widest"
                >
                    Wyczyść filtry
                </button>
            )}
        </div>
        <div className="flex bg-black/60 p-1 mb-4 shrink-0 border border-stone-800 shadow-[inset_0_0_10px_rgba(0,0,0,1)]">
            {Object.entries(TAB_LABELS).map(([tab, label]) => {
                const isActive = activeTab === tab;
                return (
                    <button
                        key={tab}
                        type="button"
                        onClick={() => onTabChange(tab)}
                        aria-pressed={isActive}
                        className={`database-tab-button flex-1 py-2 text-xs font-serif font-bold uppercase tracking-widest transition-all ${isActive ? "border-b-2 border-red-700" : "border-b-2 border-transparent"}`}
                    >
                        <span
                            className={
                                isActive ? "text-stone-100" : "text-stone-500 hover:text-stone-300"
                            }
                        >
                            {label}
                        </span>
                    </button>
                );
            })}
        </div>
        <div className="shrink-0 mb-4 flex flex-col gap-2">
            <input
                type="text"
                aria-label={`Wyszukaj ${activeTab === "items" ? "przedmioty" : activeTab === "orbs" ? "orby" : "drify"}`}
                placeholder={`Wyszukaj ${activeTab === "items" ? "(np. Morana)" : activeTab === "orbs" ? "orba" : "drifa"}...`}
                value={filters.search}
                onChange={(event) => onFilterChange("search", event.target.value)}
                className="w-full bg-black/60 text-stone-300 font-serif p-2 text-sm border border-stone-800 focus:border-rose-900 outline-none transition-colors shadow-[inset_0_0_10px_rgba(0,0,0,1)]"
            />
            <div className="flex gap-2">
                {activeTab === "items" && (
                    <>
                        <select
                            aria-label="Filtruj przedmioty według kategorii"
                            value={filters.category}
                            onChange={(event) => onFilterChange("category", event.target.value)}
                            className={selectClass}
                        >
                            {allCategories.map((value) => (
                                <option key={value} value={value}>
                                    {value}
                                </option>
                            ))}
                        </select>
                        <select
                            aria-label="Filtruj przedmioty według tieru"
                            value={filters.tier}
                            onChange={(event) => onFilterChange("tier", event.target.value)}
                            className={`${selectClass} font-bold uppercase tracking-wider`}
                        >
                            {allTiers.map((value) => (
                                <option key={value} value={value}>
                                    {value === "Wszystkie" ? "Tier..." : value}
                                </option>
                            ))}
                        </select>
                        <select
                            aria-label="Filtruj przedmioty według statystyki"
                            value={filters.stat}
                            onChange={(event) => onFilterChange("stat", event.target.value)}
                            className={selectClass}
                        >
                            {allStats.map((value) => (
                                <option key={value} value={value}>
                                    {value === "Wszystkie" ? "Staty..." : value}
                                </option>
                            ))}
                        </select>
                    </>
                )}
                {activeTab === "orbs" && (
                    <select
                        aria-label="Filtruj orby według kategorii"
                        value={filters.orbCategory}
                        onChange={(event) => onFilterChange("orbCategory", event.target.value)}
                        className={selectClass}
                    >
                        <option value="Wszystkie">Kategoria...</option>
                        {Object.entries(orbCategories).map(([key, value]) => (
                            <option key={key} value={key}>
                                {value}
                            </option>
                        ))}
                    </select>
                )}
                {activeTab === "drifs" && (
                    <>
                        <select
                            aria-label="Filtruj drify według kategorii"
                            value={filters.drifCategory}
                            onChange={(event) => onFilterChange("drifCategory", event.target.value)}
                            className={selectClass}
                        >
                            <option value="Wszystkie">Kategoria...</option>
                            {Object.entries(drifCategories).map(([key, value]) => (
                                <option key={key} value={key}>
                                    {value}
                                </option>
                            ))}
                        </select>
                        <input
                            type="number"
                            aria-label="Filtruj drify według mocy bazowej"
                            placeholder="Moc bazowa..."
                            value={filters.basePower}
                            onChange={(event) => onFilterChange("basePower", event.target.value)}
                            className={selectClass}
                        />
                    </>
                )}
            </div>
        </div>
    </>
);

export default ItemDatabaseControls;
