import React, { useEffect, useState, useMemo } from "react";
import { useEquipment } from "../../shared/state/EquipmentContext";
import { calculateCurrentModDetails } from "./optimizerDomain";
import { buildOptimizationConfig, findInvalidPercentageTarget } from "./optimizerConfiguration";
import OptimizerBonusColumn from "./OptimizerBonusColumn";
import OptimizerMobileNavigation from "./OptimizerMobileNavigation";
import OptimizerRunAction from "./OptimizerRunAction";
import OptimizerSettingsPanel, { OptimizerModeNavigation } from "./OptimizerSettingsPanel";
import OptimizerLocksColumn from "./OptimizerLocksColumn";
import OptimizerPriorityToolbar from "./OptimizerPriorityToolbar";
import OptimizerPriorityList from "./OptimizerPriorityList";
import OptimizerStatusSection from "./OptimizerStatusSection";
import OptimizerItemsByBonusSection from "./OptimizerItemsByBonusSection";
import OptimizerGoalsSection from "./OptimizerGoalsSection";
import OptimizerVariantsSection from "./OptimizerVariantsSection";
import OptimizerChangesSection from "./OptimizerChangesSection";
import { useOptimizerPriorities } from "./useOptimizerPriorities";
import { useOptimizationRun } from "./useOptimizationRun";
import { useOptimizerConfigFiles } from "./useOptimizerConfigFiles";
import { createRecommendationChanges } from "./advisor/optimizerRecommendation";
import { buildAdvisorConfiguration } from "./advisor/advisorConfiguration";
import AdvisorGoalsPanel from "./advisor/AdvisorGoalsPanel";
import { advisorBuildSignature } from "./advisor/advisorBuildSignature";

/**
 * Provides drif priorities, target limits, and equipment locking for optimization.
 * @returns {JSX.Element} The optimizer panel.
 */
const OptimizerPanel = ({ optimizerSettings, onOptimizerSettingsChange }) => {
    const {
        gameRules,
        drifCategories,
        runDrifOptimization,
        cancelDrifOptimization,
        requestData,
        data,
        lockedSlots,
        lockedDrifs,
        toggleSlotLock,
        toggleDrifLock,
        applyOptimizationSetup,
        stats,
        calculateStats,
    } = useEquipment();

    const {
        prioritizedBonuses,
        availableBonuses,
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
        prioritySortDirection,
        expandedPriorities,
        selectBonus,
        removeBonus,
        clearAll,
        updateBonus,
        sortByPriority,
        toggleExpanded,
        toggleAllExpanded,
        replaceConfiguration,
    } = useOptimizerPriorities(gameRules);
    const {
        isOptimizing,
        elapsedSeconds: optimizationElapsedSeconds,
        lastDurationSeconds: lastOptimizationDurationSeconds,
        status: optimizationStatus,
        activeVariantIndex,
        setActiveVariantIndex,
        reset: resetOptimization,
        run: runOptimization,
    } = useOptimizationRun(runDrifOptimization);
    const [activeMobileColumn, setActiveMobileColumn] = useState("priorities");
    useEffect(() => resetOptimization(), [optimizerSettings.mode, resetOptimization]);
    useEffect(() => {
        if (optimizerSettings.mode === "ADVISOR" && !stats && calculateStats) calculateStats();
    }, [calculateStats, optimizerSettings.mode, stats]);
    const configFiles = useOptimizerConfigFiles({
        priorities: prioritizedBonuses,
        settings: optimizerSettings,
        gameRules,
        replaceConfiguration,
        onSettingsChange: onOptimizerSettingsChange,
    });
    const currentModDetails = useMemo(
        () =>
            calculateCurrentModDetails({
                prioritizedBonuses,
                slots: requestData.slots,
                drifs: data.drifs,
                items: data.items,
                gameRules,
            }),
        [data.drifs, data.items, gameRules, prioritizedBonuses, requestData.slots]
    );
    const activeVariant = optimizationStatus?.nextVariants?.[activeVariantIndex];
    const displayedVariant = useMemo(() => {
        if (optimizerSettings.mode !== "ADVISOR" || !activeVariant?.setup) return activeVariant;
        return {
            ...activeVariant,
            changes: createRecommendationChanges({
                currentSlots: requestData.slots,
                suggestedSlots: activeVariant.setup?.slots,
                items: data.items,
                drifs: data.drifs,
                orbs: data.orbs,
            }),
        };
    }, [
        activeVariant,
        data.drifs,
        data.items,
        data.orbs,
        optimizerSettings.mode,
        requestData.slots,
    ]);

    /** Builds the request and starts the backend optimization process. */
    const handleOptimizeClick = async () => {
        if (optimizerSettings.mode === "ADVISOR") {
            try {
                await runOptimization(
                    buildAdvisorConfiguration(
                        optimizerSettings,
                        stats,
                        gameRules,
                        requestData.characterStats
                    )
                );
            } catch (error) {
                alert(error.message);
            }
            return;
        }
        if (optimizerSettings.mode !== "ADVISOR" && prioritizedBonuses.length === 0) return;
        const invalidPercentageTarget = findInvalidPercentageTarget(prioritizedBonuses);
        if (invalidPercentageTarget) {
            alert(`Podaj poprawny, nieujemny procent dla: ${invalidPercentageTarget.value}.`);
            return;
        }
        const configuration = buildOptimizationConfig(prioritizedBonuses, optimizerSettings);
        await runOptimization(configuration);
    };

    /** Applies the explicitly selected result variant to the shared equipment build. */
    const handleApplyVariant = (variant, variantIndex) => {
        if (optimizerSettings.mode === "ADVISOR" && optimizationStatus?.baselineSignature) {
            const current = advisorBuildSignature(requestData.slots);
            const constraints = JSON.stringify({
                characterStats: requestData.characterStats || {},
                lockedSlots,
                lockedDrifs,
            });
            if (
                (optimizationStatus.baselineConstraintsSignature &&
                    constraints !== optimizationStatus.baselineConstraintsSignature) ||
                (current !== optimizationStatus.baselineSignature &&
                    !optimizationStatus.nextVariants?.some(
                        (v) => advisorBuildSignature(v.setup?.slots) === current
                    ))
            ) {
                alert("Build zmienił się od analizy. Uruchom Doradcę ponownie.");
                return;
            }
        }
        if (applyOptimizationSetup(variant?.setup)) setActiveVariantIndex(variantIndex);
    };

    return (
        <div className="optimizer-console">
            <OptimizerModeNavigation
                settings={optimizerSettings}
                onChange={onOptimizerSettingsChange}
            />
            <OptimizerMobileNavigation
                activeColumn={activeMobileColumn}
                priorityCount={prioritizedBonuses.length}
                onChange={setActiveMobileColumn}
                mode={optimizerSettings.mode}
            />
            <div className="optimizer-main-grid">
                <OptimizerLocksColumn
                    active={activeMobileColumn === "slots"}
                    slots={requestData.slots}
                    items={data.items}
                    drifs={data.drifs}
                    lockedSlots={lockedSlots}
                    lockedDrifs={lockedDrifs}
                    onToggleSlot={toggleSlotLock}
                    onToggleDrif={toggleDrifLock}
                    mode={optimizerSettings.mode}
                />

                <section
                    className={`optimizer-workspace-column optimizer-goals-column ${["bonuses", "priorities"].includes(activeMobileColumn) ? "flex" : "hidden"} flex-col lg:flex`}
                    aria-labelledby="optimizer-goals-heading"
                >
                    <header className="optimizer-column-heading optimizer-goals-heading">
                        <div>
                            <span className="optimizer-heading-icon" aria-hidden="true">
                                ◉
                            </span>
                            <h3 id="optimizer-goals-heading">Cele optymalizacji</h3>
                        </div>
                        <p>Wybierz bonusy, ustaw kolejność oraz wymagane limity.</p>
                    </header>
                    {optimizerSettings.mode === "ADVISOR" ? (
                        <AdvisorGoalsPanel
                            stats={stats || {}}
                            gameRules={gameRules}
                            settings={optimizerSettings}
                            onChange={onOptimizerSettingsChange}
                        />
                    ) : (
                        <div className="optimizer-goals-workspace">
                            <OptimizerBonusColumn
                                active={activeMobileColumn === "bonuses"}
                                bonuses={availableBonuses}
                                searchQuery={searchQuery}
                                selectedCategory={selectedCategory}
                                categoryLabels={drifCategories}
                                onSearchChange={setSearchQuery}
                                onCategoryChange={setSelectedCategory}
                                onSelect={(bonus) => {
                                    selectBonus(bonus);
                                    setActiveMobileColumn("priorities");
                                }}
                            />

                            <div
                                className={`optimizer-priority-column ${activeMobileColumn === "priorities" ? "flex" : "hidden"} min-h-0 flex-col lg:flex`}
                            >
                                <OptimizerPriorityToolbar
                                    fileInputRef={configFiles.inputRef}
                                    priorityCount={prioritizedBonuses.length}
                                    sortDirection={prioritySortDirection}
                                    anyExpanded={expandedPriorities.size > 0}
                                    onLoad={configFiles.load}
                                    onSave={configFiles.save}
                                    onSort={sortByPriority}
                                    onToggleExpanded={toggleAllExpanded}
                                    onClear={clearAll}
                                />

                                <OptimizerPriorityList
                                    priorities={prioritizedBonuses}
                                    expandedPriorities={expandedPriorities}
                                    currentDetails={currentModDetails}
                                    maxCaps={gameRules?.drifMaxCaps}
                                    onToggle={toggleExpanded}
                                    onRemove={removeBonus}
                                    onUpdate={updateBonus}
                                />
                            </div>
                        </div>
                    )}
                    <OptimizerSettingsPanel
                        settings={optimizerSettings}
                        onChange={onOptimizerSettingsChange}
                    />
                    <OptimizerRunAction
                        priorityCount={
                            optimizerSettings.mode === "ADVISOR" ? 1 : prioritizedBonuses.length
                        }
                        isOptimizing={isOptimizing}
                        elapsedSeconds={optimizationElapsedSeconds}
                        lastDurationSeconds={lastOptimizationDurationSeconds}
                        hasResult={Boolean(optimizationStatus)}
                        onRun={handleOptimizeClick}
                        onCancel={async () => {
                            try {
                                await cancelDrifOptimization?.();
                            } catch {
                                alert(
                                    "Nie udało się zatrzymać analizy. Zakończy się po upływie limitu czasu."
                                );
                            }
                        }}
                        mode={optimizerSettings.mode}
                    />
                </section>

                <aside
                    className={`optimizer-workspace-column optimizer-info-column ${activeMobileColumn === "result" ? "flex" : "hidden"} flex-col lg:flex`}
                >
                    <header className="optimizer-column-heading optimizer-report-heading">
                        <div>
                            <span className="optimizer-heading-icon" aria-hidden="true">
                                ▤
                            </span>
                            <h3>
                                {optimizerSettings.mode === "ADVISOR"
                                    ? "Rekomendacje doradcy"
                                    : "Raport optymalizacji"}
                            </h3>
                        </div>
                    </header>

                    <div className="optimizer-report-scroll custom-scrollbar">
                        <OptimizerStatusSection
                            isOptimizing={isOptimizing}
                            elapsedSeconds={optimizationElapsedSeconds}
                            status={optimizationStatus}
                            lastDurationSeconds={lastOptimizationDurationSeconds}
                        />

                        <OptimizerGoalsSection
                            goals={optimizationStatus?.goalResults}
                            currentDetails={currentModDetails}
                            activeVariant={displayedVariant}
                            maxCaps={gameRules?.drifMaxCaps}
                        />

                        <OptimizerVariantsSection
                            variants={optimizationStatus?.nextVariants}
                            activeIndex={activeVariantIndex}
                            onSelect={(_variant, variantIndex) =>
                                setActiveVariantIndex(variantIndex)
                            }
                            onApply={handleApplyVariant}
                            advisory={optimizerSettings.mode === "ADVISOR"}
                        />
                        <OptimizerChangesSection
                            variant={displayedVariant}
                            maxCaps={gameRules?.drifMaxCaps}
                            translations={gameRules?.bonusTranslations}
                            advisory={optimizerSettings.mode === "ADVISOR"}
                        />
                        <details className="optimizer-full-report">
                            <summary>Pokaż pełny raport</summary>
                            <OptimizerItemsByBonusSection
                                itemsByBonus={optimizationStatus?.itemsByDrifBonus}
                            />
                        </details>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default OptimizerPanel;
