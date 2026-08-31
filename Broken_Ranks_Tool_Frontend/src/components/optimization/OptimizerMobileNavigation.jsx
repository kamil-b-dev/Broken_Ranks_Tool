const COLUMNS = [
    ["slots", "Blokady"],
    ["bonuses", "Bonusy"],
    ["priorities", "Priorytety"],
    ["result", "Raport"],
];

/** Switches between optimizer columns on narrow screens. */
const OptimizerMobileNavigation = ({ activeColumn, priorityCount, onChange }) => (
    <nav
        className="lg:hidden grid grid-cols-4 gap-1 mb-3 shrink-0"
        aria-label="Sekcje optymalizatora"
    >
        {COLUMNS.map(([key, label]) => (
            <button
                key={key}
                type="button"
                onClick={() => onChange(key)}
                aria-current={activeColumn === key ? "page" : undefined}
                className={`px-2 py-2 border rounded-sm text-[9px] sm:text-[10px] uppercase tracking-wide transition-colors ${
                    activeColumn === key
                        ? "border-purple-500 bg-purple-950/50 text-purple-200"
                        : "border-stone-800 bg-black/30 text-stone-500"
                }`}
            >
                {key === "priorities" ? `${label} (${priorityCount})` : label}
            </button>
        ))}
    </nav>
);

export default OptimizerMobileNavigation;
