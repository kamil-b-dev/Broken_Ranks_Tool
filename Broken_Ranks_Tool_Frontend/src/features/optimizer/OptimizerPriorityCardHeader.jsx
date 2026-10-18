import { useTranslation } from "../../shared/i18n/useTranslation";
import CategoryIcon from "../../shared/ui/CategoryIcon";

/** Summarizes one priority and exposes its expand and remove actions. */
const OptimizerPriorityCardHeader = ({ index, bonus, expanded, onToggle, onRemove, simple }) => {
    const { t } = useTranslation();
    return (
        <div className="optimizer-priority-card-header">
            <span className="optimizer-priority-rank">{t(index + 1)}</span>
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
                <span className="optimizer-priority-name">{t(bonus.value)}</span>
                {!expanded && (
                    <span className="optimizer-priority-compact-meta">
                        {t(
                            simple
                                ? "automatyczny dobór"
                                : `waga ${bonus.weight} · ${bonus.min}–${bonus.max}`
                        )}
                        {t(bonus.forceCap ? " · cel: cap" : "")}
                        {t(!simple && bonus.forcePercentage ? ` · ${bonus.forcedPercentage}%` : "")}
                        {t(!simple && bonus.maximize ? " · max" : "")}
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
                title={t("Usuń z priorytetów")}
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
};

export default OptimizerPriorityCardHeader;
