import OptimizerChangesSection from "./OptimizerChangesSection";
import OptimizerGoalsSection from "./OptimizerGoalsSection";
import OptimizerItemsByBonusSection from "./OptimizerItemsByBonusSection";
import OptimizerStatusSection from "./OptimizerStatusSection";
import OptimizerVariantsSection from "./OptimizerVariantsSection";

/** Progress, verified variants, and the detailed optimization report. */
const OptimizerReportColumn = ({
    active,
    advisory,
    isOptimizing,
    elapsedSeconds,
    status,
    lastDurationSeconds,
    currentDetails,
    displayedVariant,
    maxCaps,
    translations,
    activeVariantIndex,
    onSelectVariant,
    onApplyVariant,
}) => (
    <aside
        className={`optimizer-workspace-column optimizer-info-column ${active ? "flex" : "hidden"} flex-col lg:flex`}
    >
        <header className="optimizer-column-heading optimizer-report-heading">
            <div>
                <span className="optimizer-heading-icon" aria-hidden="true">
                    ▤
                </span>
                <h3>{advisory ? "Rekomendacje doradcy" : "Raport optymalizacji"}</h3>
            </div>
        </header>
        <div className="optimizer-report-scroll custom-scrollbar">
            {(isOptimizing || status) && (
                <>
                    <OptimizerStatusSection
                        isOptimizing={isOptimizing}
                        elapsedSeconds={elapsedSeconds}
                        status={status}
                        lastDurationSeconds={lastDurationSeconds}
                    />
                    {status && (
                        <>
                            <OptimizerGoalsSection
                                goals={status.goalResults}
                                currentDetails={currentDetails}
                                activeVariant={displayedVariant}
                                maxCaps={maxCaps}
                            />
                            <OptimizerVariantsSection
                                variants={status.nextVariants}
                                activeIndex={activeVariantIndex}
                                onSelect={onSelectVariant}
                                onApply={onApplyVariant}
                                advisory={advisory}
                            />
                            <OptimizerChangesSection
                                variant={displayedVariant}
                                maxCaps={maxCaps}
                                translations={translations}
                                advisory={advisory}
                            />
                            {Object.keys(status.itemsByDrifBonus || {}).length > 0 && (
                                <details className="optimizer-full-report">
                                    <summary>Pokaż pełny raport</summary>
                                    <OptimizerItemsByBonusSection
                                        itemsByBonus={status.itemsByDrifBonus}
                                    />
                                </details>
                            )}
                        </>
                    )}
                </>
            )}
        </div>
    </aside>
);

export default OptimizerReportColumn;
