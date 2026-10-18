import ReorganizationReport from "../reorganization/ReorganizationReport.jsx";
import { useTranslation } from "../../../shared/i18n/useTranslation";
import OptimizerStatusSection from "../OptimizerStatusSection";
import OptimizerGoalsSection from "../OptimizerGoalsSection";
import OptimizerVariantsSection from "../OptimizerVariantsSection";
import OptimizerChangesSection from "../OptimizerChangesSection";
import OptimizerItemsByBonusSection from "../OptimizerItemsByBonusSection";

export default function MobileOptimizerReport({ model, advisory }) {
    const { t } = useTranslation();

    const status = model.displayedStatus ?? model.optimizationStatus;
    return (
        <section
            className="mobile-optimizer-report"
            aria-label={t(advisory ? "Porady Doradcy" : "Wynik optymalizacji")}
        >
            {!status && !model.isOptimizing && (
                <p className="mobile-muted">
                    {t(
                        advisory
                            ? "Uruchom analizę, aby zobaczyć propozycje zmian buildu."
                            : "Uruchom optymalizację, aby zobaczyć wynik i realizację celów."
                    )}
                </p>
            )}
            <OptimizerStatusSection
                isOptimizing={model.isOptimizing}
                elapsedSeconds={model.optimizationElapsedSeconds}
                startedAt={model.optimizationStartedAt}
                status={status}
                lastDurationSeconds={model.lastOptimizationDurationSeconds}
            />
            {status && (
                <>
                    {status.mode !== "REORGANIZE" && !status.reorganizationOptions && (
                        <>
                            <OptimizerGoalsSection
                                goals={status.goalResults}
                                currentDetails={model.reportModDetails}
                                activeVariant={model.displayedVariant}
                                maxCaps={model.gameRules.drifMaxCaps}
                                showTargetLabel
                                advisory={advisory}
                            />
                            <fieldset
                                disabled={model.isOptimizing}
                                aria-label={t("Wybór wariantu")}
                            >
                                <OptimizerVariantsSection
                                    variants={status.nextVariants}
                                    activeIndex={model.activeVariantIndex}
                                    onSelect={(_variant, index) =>
                                        model.setActiveVariantIndex(index)
                                    }
                                    onApply={(variant, index) => {
                                        model.setNotice(null);
                                        model.handleApplyVariant(variant, index);
                                    }}
                                    advisory={advisory}
                                />
                            </fieldset>
                        </>
                    )}
                    <ReorganizationReport
                        report={status.reorganizationReport}
                        statChanges={status.reorganizationStatChanges}
                        translations={model.gameRules.bonusTranslations}
                    />
                    {status.mode !== "REORGANIZE" && !status.reorganizationOptions && (
                        <OptimizerChangesSection
                            variant={model.displayedVariant}
                            maxCaps={model.gameRules.drifMaxCaps}
                            translations={model.gameRules.bonusTranslations}
                            advisory={advisory}
                        />
                    )}
                    {Object.keys(status.itemsByDrifBonus || {}).length > 0 && (
                        <details className="mobile-card">
                            <summary>{t("Rozmieszczenie drifów")}</summary>
                            <OptimizerItemsByBonusSection itemsByBonus={status.itemsByDrifBonus} />
                        </details>
                    )}
                </>
            )}
        </section>
    );
}
