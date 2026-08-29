/** Summarizes one priority and exposes its expand and remove actions. */
const OptimizerPriorityCardHeader = ({ index, bonus, expanded, onToggle, onRemove }) => (
    <div
        className={`relative z-10 flex items-center justify-between bg-black/40 p-2 ${expanded ? "border-b border-purple-900/30" : ""}`}
    >
        <button
            type="button"
            onClick={onToggle}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
            aria-expanded={expanded}
        >
            <span className="text-xs font-bold text-purple-500">{index + 1}.</span>
            <span className="truncate text-xs font-bold text-stone-200 font-serif">
                {bonus.value}
            </span>
            {!expanded && (
                <span className="ml-auto whitespace-nowrap text-[9px] uppercase tracking-wide text-stone-500">
                    waga {bonus.weight} · {bonus.min}–{bonus.max}
                    {bonus.forceCap ? " · cel: cap" : ""}
                    {bonus.forcePercentage ? ` · ${bonus.forcedPercentage}%` : ""}
                    {bonus.maximize ? " · max" : ""}
                </span>
            )}
            <svg
                className={`h-3 w-3 shrink-0 text-stone-500 transition-transform ${expanded ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                />
            </svg>
        </button>
        <button
            type="button"
            onClick={onRemove}
            className="ml-2 p-1 text-stone-600 transition-colors hover:text-red-500"
            title="Usuń z priorytetów"
        >
            <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                />
            </svg>
        </button>
    </div>
);

export default OptimizerPriorityCardHeader;
