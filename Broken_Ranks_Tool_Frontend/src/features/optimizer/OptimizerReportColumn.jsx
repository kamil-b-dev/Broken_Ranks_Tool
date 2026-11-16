import ReorganizationReport from "./reorganization/ReorganizationReport.jsx";
import ReorganizationUndo from "./reorganization/ReorganizationUndo.jsx";
import { useTranslation } from "../../shared/i18n/useTranslation";
import OptimizerChangesSection from "./OptimizerChangesSection";
import OptimizerGoalsSection from "./OptimizerGoalsSection";
import OptimizerItemsByBonusSection from "./OptimizerItemsByBonusSection";
import OptimizerStatusSection from "./OptimizerStatusSection";
import OptimizerVariantsSection from "./OptimizerVariantsSection";
import OptimizerReportViews from "./OptimizerReportViews";

/** Progress, verified variants, and the detailed optimization report. */
const OptimizerReportColumn = ({
    active,
    archive,
    embedded = false,
    advisory,
    isOptimizing,
    elapsedSeconds,
    startedAt,
    status,
    lastDurationSeconds,
    currentDetails,
    displayedVariant,
    maxCaps,
    translations,
    activeVariantIndex,
    onSelectVariant,
    onApplyVariant,
    canUndoReorganization,
    reorganizationUndoWarning,
    onUndoReorganization,
}) => {
    const { t } = useTranslation();
    const report = (
        <div className="optimizer-report-scroll custom-scrollbar">
            <ReorganizationUndo
                available={canUndoReorganization}
                warning={reorganizationUndoWarning}
                disabled={isOptimizing}
                onUndo={onUndoReorganization}
            />
            {(isOptimizing || status) && (
                <>
                    <OptimizerStatusSection
                        isOptimizing={isOptimizing}
                        elapsedSeconds={elapsedSeconds}
                        startedAt={startedAt}
                        status={status}
                        lastDurationSeconds={lastDurationSeconds}
                    />
                    {status && (
                        <>
                            {status.mode !== "REORGANIZE" && !status.reorganizationOptions && (
                                <>
                                    <OptimizerGoalsSection
                                        goals={status.goalResults}
                                        currentDetails={currentDetails}
                                        activeVariant={displayedVariant}
                                        maxCaps={maxCaps}
                                        advisory={advisory}
                                    />
                                    <OptimizerVariantsSection
                                        variants={status.nextVariants}
                                        activeIndex={activeVariantIndex}
                                        onSelect={onSelectVariant}
                                        onApply={onApplyVariant}
                                        advisory={advisory}
                                    />
                                </>
                            )}
                            <ReorganizationReport
                                report={status.reorganizationReport}
                                statChanges={status.reorganizationStatChanges}
                                translations={translations}
                            />
                            {status.mode !== "REORGANIZE" && !status.reorganizationOptions && (
                                <OptimizerChangesSection
                                    variant={displayedVariant}
                                    maxCaps={maxCaps}
                                    translations={translations}
                                    advisory={advisory}
                                />
                            )}
                            {Object.keys(status.itemsByDrifBonus || {}).length > 0 && (
                                <details className="optimizer-full-report">
                                    <summary>{t("Pokaż pełny raport")}</summary>
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
    );

    if (embedded) return report;

    return (
        <aside
            className={`optimizer-workspace-column optimizer-info-column ${active ? "flex" : "hidden"} flex-col lg:flex`}
            aria-label={t(advisory ? "Rekomendacje doradcy" : "Raport optymalizacji")}
        >
            <OptimizerReportViews archive={archive}>{report}</OptimizerReportViews>
        </aside>
    );
};

export default OptimizerReportColumn;
