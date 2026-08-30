import React, { useState, useMemo, useRef } from "react";
import { useEquipment } from "../context/EquipmentContext";
import { calculateCurrentModDetails } from "./optimization/optimizerDomain";
import {
    buildOptimizationConfig,
    createOptimizerConfigPayload,
    findInvalidPercentageTarget,
    parseOptimizerConfigPayload,
} from "./optimization/optimizerConfiguration";
import OptimizerBonusColumn from "./optimization/OptimizerBonusColumn";
import OptimizerMobileNavigation from "./optimization/OptimizerMobileNavigation";
import OptimizerRunAction from "./optimization/OptimizerRunAction";
import OptimizerLocksColumn from "./optimization/OptimizerLocksColumn";
import OptimizerPriorityToolbar from "./optimization/OptimizerPriorityToolbar";
import OptimizerPriorityCardHeader from "./optimization/OptimizerPriorityCardHeader";
import OptimizerPriorityForm from "./optimization/OptimizerPriorityForm";
import OptimizerStatusSection from "./optimization/OptimizerStatusSection";
import OptimizerItemsByBonusSection from "./optimization/OptimizerItemsByBonusSection";
import OptimizerGoalsSection from "./optimization/OptimizerGoalsSection";
import OptimizerVariantsSection from "./optimization/OptimizerVariantsSection";
import {
    downloadOptimizerConfiguration,
    readOptimizerConfigurationFile,
} from "./optimization/optimizerConfigFiles";
import { useOptimizerPriorities } from "../hooks/useOptimizerPriorities";
import { useOptimizationRun } from "../hooks/useOptimizationRun";

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
    const configInputRef = useRef(null);

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

    const handleSaveConfiguration = () => {
        const payload = createOptimizerConfigPayload(prioritizedBonuses, optimizerSettings);
        downloadOptimizerConfiguration(payload);
    };

    const handleLoadConfiguration = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        try {
            const payload = await readOptimizerConfigurationFile(file);
            const imported = parseOptimizerConfigPayload(payload, gameRules);
            replaceConfiguration(imported);
            if (imported.maxVariantLossPercent !== null) {
                onOptimizerSettingsChange((previous) => ({
                    ...previous,
                    maxVariantLossPercent: imported.maxVariantLossPercent,
                }));
            }
            alert(`Wczytano konfigurację: ${imported.priorities.length} priorytetów.`);
        } catch (error) {
            const message = error.message || "niepoprawny plik JSON.";
            alert(
                message === "Plik konfiguracji jest zbyt duży."
                    ? message
                    : `Nie udało się wczytać konfiguracji: ${message}`
            );
        }
    };

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
                        fileInputRef={configInputRef}
                        priorityCount={prioritizedBonuses.length}
                        sortDirection={prioritySortDirection}
                        anyExpanded={expandedPriorities.size > 0}
                        onLoad={handleLoadConfiguration}
                        onSave={handleSaveConfiguration}
                        onSort={sortByPriority}
                        onToggleExpanded={toggleAllExpanded}
                        onClear={clearAll}
                    />

                    <div className="overflow-y-auto pr-2 flex-1 min-h-0 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-stone-800 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-purple-800/70">
                        {prioritizedBonuses.length === 0 ? (
                            <p className="text-center text-stone-600 italic mt-10 text-xs font-serif">
                                Wybierz bonusy z lewej listy, aby ustawić priorytety.
                            </p>
                        ) : (
                            prioritizedBonuses.map((bonus, index) => {
                                const maxCap = gameRules?.drifMaxCaps?.[bonus.key];
                                const isExpanded = expandedPriorities.has(bonus.key);
                                const potential = currentModDetails.find(
                                    (detail) => detail.key === bonus.key
                                );

                                return (
                                    <div
                                        key={bonus.key}
                                        className="flex flex-col bg-stone-900/50 border border-purple-900/40 mb-3 rounded-sm shadow-md transition-colors relative overflow-hidden"
                                    >
                                        <div
                                            className="absolute top-0 left-0 h-full bg-purple-900/10 pointer-events-none"
                                            style={{ width: `${(bonus.weight / 30) * 100}%` }}
                                        ></div>

                                        <OptimizerPriorityCardHeader
                                            index={index}
                                            bonus={bonus}
                                            expanded={isExpanded}
                                            onToggle={() => toggleExpanded(bonus.key)}
                                            onRemove={() => removeBonus(bonus)}
                                        />

                                        {isExpanded && (
                                            <OptimizerPriorityForm
                                                bonus={bonus}
                                                potential={potential}
                                                maxCap={maxCap}
                                                onChange={(field, value) =>
                                                    updateBonus(bonus.key, field, value)
                                                }
                                            />
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
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
