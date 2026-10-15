import {
    DRIF_CATEGORY_LABELS,
    DRIF_CATEGORY_ORDER,
} from "../../shared/domain/equipment/drifCategories";

const BUTTON_CLASS = "optimizer-toolbar-button";

/** Provides file and bulk actions for the optimizer priority list. */
const OptimizerPriorityToolbar = ({
    fileInputRef,
    priorityCount,
    sortDirection,
    categorySorted,
    hiddenCategories = new Set(),
    categoryCounts = {},
    anyExpanded,
    onLoad,
    onSave,
    onSort,
    onSortCategories,
    onToggleCategory,
    onShowAllCategories,
    onToggleExpanded,
    onClear,
}) => (
    <header className="optimizer-priority-toolbar">
        <h4>Priorytety i limity</h4>
        <div>
            <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={onLoad}
                className="hidden"
            />
            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={BUTTON_CLASS}
                title="Wczytaj priorytety i limity z pliku JSON"
            >
                Wczytaj
            </button>
            <button
                type="button"
                onClick={onSave}
                className={BUTTON_CLASS}
                title="Zapisz priorytety i limity do pliku JSON"
            >
                Zapisz
            </button>
            <button
                type="button"
                onClick={onSort}
                disabled={priorityCount < 2}
                className={BUTTON_CLASS}
                title={`Sortuj według wagi ${sortDirection === "desc" ? "malejąco" : "rosnąco"}`}
            >
                Priorytet {sortDirection === "desc" ? "↓" : "↑"}
            </button>
            <button
                type="button"
                onClick={onSortCategories}
                disabled={priorityCount < 2}
                aria-pressed={Boolean(categorySorted)}
                className={BUTTON_CLASS}
                title="Sortuj według kategorii: ofensywne, defensywne, użytkowe"
            >
                Kategorie
            </button>
            {priorityCount > 0 && (
                <>
                    <button type="button" onClick={onToggleExpanded} className={BUTTON_CLASS}>
                        {anyExpanded ? "Zwiń" : "Rozwiń"}
                    </button>
                    <button
                        type="button"
                        onClick={onClear}
                        className="optimizer-toolbar-button optimizer-toolbar-clear"
                    >
                        Wyczyść
                    </button>
                </>
            )}
        </div>
        {priorityCount > 0 && (
            <div
                className="optimizer-priority-category-visibility"
                role="group"
                aria-label="Widoczne kategorie priorytetów"
            >
                <span>Pokaż:</span>
                {DRIF_CATEGORY_ORDER.map((category) => (
                    <button
                        key={category}
                        type="button"
                        className="optimizer-toolbar-button"
                        aria-pressed={!hiddenCategories.has(category)}
                        title={`${hiddenCategories.has(category) ? "Pokaż" : "Ukryj"} mody ${DRIF_CATEGORY_LABELS[category].toLocaleLowerCase("pl")}`}
                        onClick={() => onToggleCategory(category)}
                    >
                        {DRIF_CATEGORY_LABELS[category]} ({categoryCounts[category] || 0})
                    </button>
                ))}
                {hiddenCategories.size > 0 && (
                    <button
                        type="button"
                        className="optimizer-toolbar-button"
                        onClick={onShowAllCategories}
                    >
                        Pokaż wszystkie
                    </button>
                )}
            </div>
        )}
    </header>
);

export default OptimizerPriorityToolbar;
