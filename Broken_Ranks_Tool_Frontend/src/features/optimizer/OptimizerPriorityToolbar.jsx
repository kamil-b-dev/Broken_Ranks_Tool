import { useTranslation } from "../../shared/i18n/useTranslation";
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
}) => {
    const { t } = useTranslation();
    return (
        <header className="optimizer-priority-toolbar">
            <h4>{t("Priorytety i limity")}</h4>
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
                    title={t("Wczytaj priorytety i limity z pliku JSON")}
                >
                    {t("Wczytaj")}
                </button>
                <button
                    type="button"
                    onClick={onSave}
                    className={BUTTON_CLASS}
                    title={t("Zapisz priorytety i limity do pliku JSON")}
                >
                    {t("Zapisz")}
                </button>
                <button
                    type="button"
                    onClick={onSort}
                    disabled={priorityCount < 2}
                    className={BUTTON_CLASS}
                    title={t("Sortuj według wagi {0}", [
                        t(sortDirection === "desc" ? "malejąco" : "rosnąco"),
                    ])}
                >
                    {t("Priorytet ")}
                    {t(sortDirection === "desc" ? "↓" : "↑")}
                </button>
                <button
                    type="button"
                    onClick={onSortCategories}
                    disabled={priorityCount < 2}
                    aria-pressed={Boolean(categorySorted)}
                    className={BUTTON_CLASS}
                    title={t("Sortuj według kategorii: ofensywne, defensywne, użytkowe")}
                >
                    {t("Kategorie")}
                </button>
                {priorityCount > 0 && (
                    <>
                        <button type="button" onClick={onToggleExpanded} className={BUTTON_CLASS}>
                            {t(anyExpanded ? "Zwiń" : "Rozwiń")}
                        </button>
                        <button
                            type="button"
                            onClick={onClear}
                            className="optimizer-toolbar-button optimizer-toolbar-clear"
                        >
                            {t("Wyczyść")}
                        </button>
                    </>
                )}
            </div>
            {priorityCount > 0 && (
                <div
                    className="optimizer-priority-category-visibility"
                    role="group"
                    aria-label={t("Widoczne kategorie priorytetów")}
                >
                    <span>{t("Pokaż:")}</span>
                    {DRIF_CATEGORY_ORDER.map((category) => (
                        <button
                            key={category}
                            type="button"
                            className="optimizer-toolbar-button"
                            aria-pressed={!hiddenCategories.has(category)}
                            title={t("{0} mody {1}", [
                                t(hiddenCategories.has(category) ? "Pokaż" : "Ukryj"),
                                t(DRIF_CATEGORY_LABELS[category].toLocaleLowerCase("pl")),
                            ])}
                            onClick={() => onToggleCategory(category)}
                        >
                            {t(DRIF_CATEGORY_LABELS[category])} ({t(categoryCounts[category] || 0)})
                        </button>
                    ))}
                    {hiddenCategories.size > 0 && (
                        <button
                            type="button"
                            className="optimizer-toolbar-button"
                            onClick={onShowAllCategories}
                        >
                            {t("Pokaż wszystkie")}
                        </button>
                    )}
                </div>
            )}
        </header>
    );
};

export default OptimizerPriorityToolbar;
