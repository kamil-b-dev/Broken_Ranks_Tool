import CategoryIcon from "../CategoryIcon";
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
    <section
        className={`optimizer-bonus-column ${active ? "flex" : "hidden"} min-h-0 flex-col lg:flex`}
        aria-labelledby="optimizer-bonuses-heading"
    >
        <header className="optimizer-subcolumn-heading">
            <h4 id="optimizer-bonuses-heading">Dostępne bonusy</h4>
        </header>
        <div className="optimizer-bonus-search">
            <input
                type="text"
                placeholder="Szukaj statystyki..."
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                className="w-full"
            />
            <span aria-hidden="true">⌕</span>
        </div>
        <div
            className="optimizer-bonus-filters"
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
                    >
                        {categoryKey !== "ALL" && (
                            <CategoryIcon
                                kind="drif"
                                category={categoryKey}
                                className="optimizer-filter-category-icon"
                            />
                        )}
                        {label}
                    </button>
                );
            })}
        </div>
        <div className="optimizer-bonus-list custom-scrollbar">
            {bonuses.length === 0 ? (
                <p className="text-center text-stone-600 italic mt-4 text-xs font-serif">
                    Brak wyników...
                </p>
            ) : (
                bonuses.map((bonus) => (
                    <button
                        type="button"
                        key={bonus.key}
                        onClick={() => onSelect(bonus)}
                        className="optimizer-bonus-card group"
                    >
                        <CategoryIcon
                            kind="drif"
                            category={bonus.categoryKey}
                            className="optimizer-bonus-glyph"
                            fallback={
                                <span
                                    className="optimizer-bonus-glyph"
                                    data-category={bonus.categoryKey?.toLowerCase()}
                                    aria-hidden="true"
                                >
                                    ◇
                                </span>
                            }
                        />
                        <span
                            className={`${DRIF_CATEGORY_TEXT_CLASSES[bonus.categoryKey] || "text-stone-400 group-hover:text-stone-200"}`}
                        >
                            {bonus.value}
                        </span>
                        <span className="optimizer-bonus-add" aria-hidden="true">
                            +
                        </span>
                    </button>
                ))
            )}
        </div>
    </section>
);

export default OptimizerBonusColumn;
