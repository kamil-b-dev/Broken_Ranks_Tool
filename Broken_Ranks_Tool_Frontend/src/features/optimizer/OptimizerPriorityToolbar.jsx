const BUTTON_CLASS = "optimizer-toolbar-button";

/** Provides file and bulk actions for the optimizer priority list. */
const OptimizerPriorityToolbar = ({
    fileInputRef,
    priorityCount,
    sortDirection,
    anyExpanded,
    onLoad,
    onSave,
    onSort,
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
    </header>
);

export default OptimizerPriorityToolbar;
