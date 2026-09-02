import React, { useState, useMemo } from "react";
import { useEquipment } from "../../context/EquipmentContext";
import { calculateCurrentModDetails } from "./optimizerDomain";
import { buildOptimizationConfig, findInvalidPercentageTarget } from "./optimizerConfiguration";
import OptimizerBonusColumn from "./OptimizerBonusColumn";
import OptimizerMobileNavigation from "./OptimizerMobileNavigation";
import OptimizerRunAction from "./OptimizerRunAction";
import OptimizerSettingsPanel from "./OptimizerSettingsPanel";
import OptimizerLocksColumn from "./OptimizerLocksColumn";
import OptimizerPriorityToolbar from "./OptimizerPriorityToolbar";
import OptimizerPriorityList from "./OptimizerPriorityList";
import OptimizerStatusSection from "./OptimizerStatusSection";
import OptimizerItemsByBonusSection from "./OptimizerItemsByBonusSection";
import OptimizerGoalsSection from "./OptimizerGoalsSection";
import OptimizerVariantsSection from "./OptimizerVariantsSection";
import OptimizerChangesSection from "./OptimizerChangesSection";
import { useOptimizerPriorities } from "../../hooks/useOptimizerPriorities";
import { useOptimizationRun } from "../../hooks/useOptimizationRun";
import { useOptimizerConfigFiles } from "../../hooks/useOptimizerConfigFiles";

/**
 * Provides drif priorities, target limits, and equipment locking for optimization.
 * @returns {JSX.Element} The optimizer panel.
 */
const OptimizerPanel = ({ optimizerSettings, onOptimizerSettingsChange }) => {
    const {
        gameRules,
        drifCategories,
        runDrifOptimization,
        requestData,
        data,
        lockedSlots,
        lockedDrifs,
        toggleSlotLock,
        toggleDrifLock,
        applyOptimizationSetup,
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
        run: runOptimization,
    } = useOptimizationRun(runDrifOptimization);
    const [activeMobileColumn, setActiveMobileColumn] = useState("priorities");
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

    /** Builds the request and starts the backend optimization process. */
    const handleOptimizeClick = async () => {
        if (prioritizedBonuses.length === 0) return;
        const invalidPercentageTarget = findInvalidPercentageTarget(prioritizedBonuses);
        if (invalidPercentageTarget) {
            alert(`Podaj poprawny, nieujemny procent dla: ${invalidPercentageTarget.value}.`);
            return;
        }
        await runOptimization(buildOptimizationConfig(prioritizedBonuses, optimizerSettings));
    };

    /** Applies the explicitly selected result variant to the shared equipment build. */
    const handleApplyVariant = (variant, variantIndex) => {
        if (applyOptimizationSetup(variant?.setup)) setActiveVariantIndex(variantIndex);
    };

    return (
        <div className="optimizer-console">
            <OptimizerMobileNavigation
                activeColumn={activeMobileColumn}
                priorityCount={prioritizedBonuses.length}
                onChange={setActiveMobileColumn}
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
                    <OptimizerSettingsPanel
                        settings={optimizerSettings}
                        onChange={onOptimizerSettingsChange}
                    />
                    <OptimizerRunAction
                        priorityCount={prioritizedBonuses.length}
                        isOptimizing={isOptimizing}
                        elapsedSeconds={optimizationElapsedSeconds}
                        lastDurationSeconds={lastOptimizationDurationSeconds}
                        hasResult={Boolean(optimizationStatus)}
                        onRun={handleOptimizeClick}
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
                            <h3>Raport optymalizacji</h3>
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
                            activeVariant={activeVariant}
                            maxCaps={gameRules?.drifMaxCaps}
                        />

                        <OptimizerVariantsSection
                            variants={optimizationStatus?.nextVariants}
                            activeIndex={activeVariantIndex}
                            onSelect={(_variant, variantIndex) =>
                                setActiveVariantIndex(variantIndex)
                            }
                            onApply={handleApplyVariant}
                        />
                        <OptimizerChangesSection
                            variant={activeVariant}
                            maxCaps={gameRules?.drifMaxCaps}
                            translations={gameRules?.bonusTranslations}
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
