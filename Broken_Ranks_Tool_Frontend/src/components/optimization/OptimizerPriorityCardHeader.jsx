import CategoryIcon from "../CategoryIcon";

/** Summarizes one priority and exposes its expand and remove actions. */
const OptimizerPriorityCardHeader = ({ index, bonus, expanded, onToggle, onRemove }) => (
    <div className="optimizer-priority-card-header">
        <span className="optimizer-priority-rank">{index + 1}</span>
        <span className="optimizer-priority-handle" aria-hidden="true">
            ⠿
        </span>
        <button
            type="button"
            onClick={onToggle}
            className="optimizer-priority-summary"
            aria-expanded={expanded}
        >
            <CategoryIcon
                kind="drif"
                category={bonus.categoryKey}
                className="optimizer-priority-glyph"
                fallback={
                    <span
                        className="optimizer-priority-glyph"
                        data-category={bonus.categoryKey?.toLowerCase()}
                        aria-hidden="true"
                    >
                        ◇
                    </span>
                }
            />
            <span className="optimizer-priority-name">{bonus.value}</span>
            {!expanded && (
                <span className="optimizer-priority-compact-meta">
                    waga {bonus.weight} · {bonus.min}–{bonus.max}
                    {bonus.forceCap ? " · cel: cap" : ""}
                    {bonus.forcePercentage ? ` · ${bonus.forcedPercentage}%` : ""}
                    {bonus.maximize ? " · max" : ""}
                </span>
            )}
            <svg
                className={`optimizer-priority-chevron ${expanded ? "rotate-180" : ""}`}
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
            className="optimizer-priority-remove"
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
