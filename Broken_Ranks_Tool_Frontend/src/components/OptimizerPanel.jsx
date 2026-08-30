import React, { useState, useMemo } from "react";
import { useEquipment } from "../context/EquipmentContext";
import { calculateCurrentModDetails } from "./optimization/optimizerDomain";
import {
    buildOptimizationConfig,
    findInvalidPercentageTarget,
} from "./optimization/optimizerConfiguration";
import OptimizerBonusColumn from "./optimization/OptimizerBonusColumn";
import OptimizerMobileNavigation from "./optimization/OptimizerMobileNavigation";
import OptimizerRunAction from "./optimization/OptimizerRunAction";
import OptimizerLocksColumn from "./optimization/OptimizerLocksColumn";
import OptimizerPriorityToolbar from "./optimization/OptimizerPriorityToolbar";
import OptimizerPriorityList from "./optimization/OptimizerPriorityList";
import OptimizerStatusSection from "./optimization/OptimizerStatusSection";
import OptimizerItemsByBonusSection from "./optimization/OptimizerItemsByBonusSection";
import OptimizerGoalsSection from "./optimization/OptimizerGoalsSection";
import OptimizerVariantsSection from "./optimization/OptimizerVariantsSection";
import { useOptimizerPriorities } from "../hooks/useOptimizerPriorities";
import { useOptimizationRun } from "../hooks/useOptimizationRun";
import { useOptimizerConfigFiles } from "../hooks/useOptimizerConfigFiles";

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

    return (
        <div className="optimizer-console bg-gradient-to-b from-stone-900 to-black p-3 sm:p-5 border-2 border-stone-800 shadow-[0_0_30px_rgba(0,0,0,0.9)] flex flex-col h-full relative">
            <OptimizerMobileNavigation
                activeColumn={activeMobileColumn}
                priorityCount={prioritizedBonuses.length}
                onChange={setActiveMobileColumn}
            />
            <div className="optimizer-main-grid grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-4">
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
                    className={`optimizer-workspace-column optimizer-priority-column ${activeMobileColumn === "priorities" ? "flex" : "hidden"} flex-col gap-2 lg:col-span-4 lg:flex lg:border-r lg:border-stone-800/60 lg:pr-4`}
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

                <aside
                    className={`optimizer-workspace-column optimizer-info-column ${activeMobileColumn === "result" ? "flex" : "hidden"} flex-col gap-4 lg:col-span-4 lg:flex`}
                >
                    <div className="flex items-center justify-between border-b border-stone-700 pb-2 min-h-[34px] shrink-0">
                        <h4 className="text-stone-300 font-serif font-bold uppercase tracking-widest text-xs">
                            Raport optymalizacji
                        </h4>
                    </div>

                    <div className="overflow-y-auto pr-2 flex-1 min-h-0 space-y-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-stone-800 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-purple-800/70">
                        <OptimizerStatusSection
                            isOptimizing={isOptimizing}
                            elapsedSeconds={optimizationElapsedSeconds}
                            status={optimizationStatus}
                            lastDurationSeconds={lastOptimizationDurationSeconds}
                        />

                        <OptimizerItemsByBonusSection
                            itemsByBonus={optimizationStatus?.itemsByDrifBonus}
                        />

                        <OptimizerGoalsSection
                            goals={optimizationStatus?.goalResults}
                            currentDetails={currentModDetails}
                            activeVariant={optimizationStatus?.nextVariants?.[activeVariantIndex]}
                            maxCaps={gameRules?.drifMaxCaps}
                        />

                        <OptimizerVariantsSection
                            variants={optimizationStatus?.nextVariants}
                            activeIndex={activeVariantIndex}
                            maxCaps={gameRules?.drifMaxCaps}
                            translations={gameRules?.bonusTranslations}
                            onSelect={(variant, variantIndex) => {
                                if (applyOptimizationSetup(variant.setup)) {
                                    setActiveVariantIndex(variantIndex);
                                }
                            }}
                        />
                    </div>
                </aside>
            </div>

            <OptimizerRunAction
                priorityCount={prioritizedBonuses.length}
                isOptimizing={isOptimizing}
                elapsedSeconds={optimizationElapsedSeconds}
                lastDurationSeconds={lastOptimizationDurationSeconds}
                hasResult={Boolean(optimizationStatus)}
                onRun={handleOptimizeClick}
            />
        </div>
    );
};

export default OptimizerPanel;
