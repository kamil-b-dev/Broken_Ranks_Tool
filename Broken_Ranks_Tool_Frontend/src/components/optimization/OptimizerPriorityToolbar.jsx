const BUTTON_CLASS =
    "rounded-sm border border-stone-700 bg-stone-900 px-2 py-1 text-[10px] uppercase tracking-wider text-stone-300 transition-all hover:border-purple-800 hover:bg-stone-800 hover:text-purple-300 disabled:cursor-not-allowed disabled:opacity-40 font-serif";

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
    <div className="flex min-h-[34px] shrink-0 items-center justify-between border-b border-stone-700 pb-2 mb-2">
        <h4 className="text-xs font-bold uppercase tracking-widest text-stone-300 font-serif">
            Priorytety i Limity
        </h4>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
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
                        className="rounded-sm border border-red-900/50 bg-red-950/60 px-2 py-1 text-[10px] uppercase tracking-wider text-red-400 transition-all hover:bg-red-900 hover:text-red-100 font-serif"
                    >
                        Wyczyść
                    </button>
                </>
            )}
        </div>
    </div>
);

export default OptimizerPriorityToolbar;
