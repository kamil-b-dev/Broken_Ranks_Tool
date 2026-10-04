import OptimizerStatusSection from "../OptimizerStatusSection";
import OptimizerGoalsSection from "../OptimizerGoalsSection";
import OptimizerVariantsSection from "../OptimizerVariantsSection";
import OptimizerChangesSection from "../OptimizerChangesSection";
import OptimizerItemsByBonusSection from "../OptimizerItemsByBonusSection";

export default function MobileOptimizerReport({ model, advisory }) {
    const status = model.optimizationStatus;
    return (
        <section
            className="mobile-optimizer-report"
            aria-label={advisory ? "Porady Doradcy" : "Wynik optymalizacji"}
        >
            {!status && !model.isOptimizing && (
                <p className="mobile-muted">
                    {advisory
                        ? "Uruchom analizę, aby zobaczyć propozycje zmian buildu."
                        : "Uruchom optymalizację, aby zobaczyć wynik i realizację celów."}
                </p>
            )}
            <OptimizerStatusSection
                isOptimizing={model.isOptimizing}
                elapsedSeconds={model.optimizationElapsedSeconds}
                status={status}
                lastDurationSeconds={model.lastOptimizationDurationSeconds}
            />
            {status && (
                <>
                    <OptimizerGoalsSection
                        goals={status.goalResults}
                        currentDetails={model.currentModDetails}
                        activeVariant={model.displayedVariant}
                        maxCaps={model.gameRules.drifMaxCaps}
                        showTargetLabel
                    />
                    <fieldset disabled={model.isOptimizing} aria-label="Wybór wariantu">
                        <OptimizerVariantsSection
                            variants={status.nextVariants}
                            activeIndex={model.activeVariantIndex}
                            onSelect={(_variant, index) => model.setActiveVariantIndex(index)}
                            onApply={(variant, index) => {
                                model.setNotice(null);
                                model.handleApplyVariant(variant, index);
                            }}
                            advisory={advisory}
                        />
                    </fieldset>
                    <OptimizerChangesSection
                        variant={model.displayedVariant}
                        maxCaps={model.gameRules.drifMaxCaps}
                        translations={model.gameRules.bonusTranslations}
                        advisory={advisory}
                    />
                    {Object.keys(status.itemsByDrifBonus || {}).length > 0 && (
                        <details className="mobile-card">
                            <summary>Rozmieszczenie drifów</summary>
                            <OptimizerItemsByBonusSection itemsByBonus={status.itemsByDrifBonus} />
                        </details>
                    )}
                </>
            )}
        </section>
    );
}
