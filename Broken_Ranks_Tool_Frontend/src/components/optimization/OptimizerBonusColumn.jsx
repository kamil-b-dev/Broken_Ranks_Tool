import {
    DRIF_CATEGORY_LABELS,
    DRIF_CATEGORY_ORDER,
    DRIF_CATEGORY_TEXT_CLASSES,
} from "./optimizerDomain";

/** Displays and filters bonus types that can be added as optimizer priorities. */
const OptimizerBonusColumn = ({
    active,
    bonuses,
    searchQuery,
    selectedCategory,
    categoryLabels,
    onSearchChange,
    onCategoryChange,
    onSelect,
}) => (
    <div
        className={`optimizer-workspace-column optimizer-bonus-column ${active ? "flex" : "hidden"} flex-col gap-2 lg:col-span-2 lg:flex lg:border-r lg:border-stone-800/60 lg:pr-4`}
    >
        <div className="flex items-center justify-center border-b border-stone-700 pb-2 mb-2 min-h-[34px] shrink-0">
            <h4 className="text-stone-300 font-serif font-bold uppercase tracking-widest text-xs">
                Dostępne Bonusy
            </h4>
        </div>
        <div className="mb-2 shrink-0">
            <input
                type="text"
                placeholder="Szukaj statystyki..."
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                className="w-full bg-stone-950/80 border border-stone-700 focus:border-purple-600 rounded-sm p-2 text-xs text-stone-200 font-serif outline-none transition-colors shadow-inner placeholder-stone-600"
            />
        </div>
        <div
            className="flex flex-wrap gap-1 mb-2 shrink-0"
            role="group"
            aria-label="Filtruj bonusy według kategorii"
        >
            {["ALL", ...DRIF_CATEGORY_ORDER].map((categoryKey) => {
                const selected = selectedCategory === categoryKey;
                const label =
                    categoryKey === "ALL"
                        ? "Wszystkie"
                        : categoryLabels?.[categoryKey] || DRIF_CATEGORY_LABELS[categoryKey];
                return (
                    <button
                        key={categoryKey}
                        type="button"
                        onClick={() => onCategoryChange(categoryKey)}
                        aria-pressed={selected}
                        className={`flex-1 min-w-[70px] px-2 py-1.5 border rounded-sm text-[10px] uppercase tracking-wider font-serif transition-colors ${
                            selected
                                ? "bg-purple-900/60 border-purple-500 text-purple-100"
                                : "bg-stone-950/80 border-stone-700 text-stone-500 hover:border-purple-800 hover:text-stone-200"
                        }`}
                    >
                        {label}
                    </button>
                );
            })}
        </div>
        <div className="overflow-y-auto pr-2 flex-1 min-h-0 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-stone-800 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-purple-800/70">
            {bonuses.length === 0 ? (
                <p className="text-center text-stone-600 italic mt-4 text-xs font-serif">
                    Brak wyników...
                </p>
            ) : (
                bonuses.map((bonus) => (
                    <div
                        key={bonus.key}
                        onClick={() => onSelect(bonus)}
                        className="optimizer-bonus-card flex justify-between items-center bg-black/40 p-2 border cursor-pointer transition-all group mb-1.5 rounded-sm shadow-sm"
                    >
                        <span
                            className={`${DRIF_CATEGORY_TEXT_CLASSES[bonus.categoryKey] || "text-stone-400 group-hover:text-stone-200"} text-xs font-serif transition-colors`}
                        >
                            {bonus.value}
                        </span>
                        <span className="text-stone-600 group-hover:text-purple-400 font-bold text-lg leading-none transition-colors shrink-0">
                            +
                        </span>
                    </div>
                ))
            )}
        </div>
    </div>
);

export default OptimizerBonusColumn;
