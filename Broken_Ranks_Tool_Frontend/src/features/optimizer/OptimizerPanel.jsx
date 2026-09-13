import { useEffect, useMemo, useState } from "react";
import { useEquipment } from "../../shared/state/EquipmentContext";
import AppNotice from "../../shared/ui/AppNotice";
import { calculateCurrentModDetails } from "./optimizerDomain";
import { buildOptimizationConfig, findInvalidPercentageTarget } from "./optimizerConfiguration";
import OptimizerMobileNavigation from "./OptimizerMobileNavigation";
import { OptimizerModeNavigation } from "./OptimizerSettingsPanel";
import OptimizerLocksColumn from "./OptimizerLocksColumn";
import OptimizerGoalsColumn from "./OptimizerGoalsColumn";
import OptimizerReportColumn from "./OptimizerReportColumn";
import { useOptimizerPriorities } from "./useOptimizerPriorities";
import { useOptimizationRun } from "./useOptimizationRun";
import { useOptimizerConfigFiles } from "./useOptimizerConfigFiles";
import { createRecommendationChanges } from "./advisor/optimizerRecommendation";
import { buildAdvisorConfiguration } from "./advisor/advisorConfiguration";
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
    const [notice, setNotice] = useState(null);
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
        onNotice: setNotice,
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
        setNotice(null);
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
                setNotice({ type: "error", message: error.message });
            }
            return;
        }
        if (optimizerSettings.mode !== "ADVISOR" && prioritizedBonuses.length === 0) return;
        const invalidPercentageTarget = findInvalidPercentageTarget(prioritizedBonuses);
        if (invalidPercentageTarget) {
            setNotice({
                type: "error",
                message: `Podaj poprawny, nieujemny procent dla: ${invalidPercentageTarget.value}.`,
            });
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
                setNotice({
                    type: "error",
                    message: "Build zmienił się od analizy. Uruchom Doradcę ponownie.",
                });
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
            <AppNotice notice={notice} onDismiss={() => setNotice(null)} />
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

                <OptimizerGoalsColumn
                    activeMobileColumn={activeMobileColumn}
                    settings={optimizerSettings}
                    onSettingsChange={onOptimizerSettingsChange}
                    stats={stats}
                    gameRules={gameRules}
                    priorities={prioritizedBonuses}
                    availableBonuses={availableBonuses}
                    searchQuery={searchQuery}
                    selectedCategory={selectedCategory}
                    categoryLabels={drifCategories}
                    onSearchChange={setSearchQuery}
                    onCategoryChange={setSelectedCategory}
                    onSelectBonus={(bonus) => {
                        selectBonus(bonus);
                        setActiveMobileColumn("priorities");
                    }}
                    sortDirection={prioritySortDirection}
                    expandedPriorities={expandedPriorities}
                    currentDetails={currentModDetails}
                    onTogglePriority={toggleExpanded}
                    onRemovePriority={removeBonus}
                    onUpdatePriority={updateBonus}
                    configFiles={configFiles}
                    onSort={sortByPriority}
                    onToggleExpanded={toggleAllExpanded}
                    onClear={clearAll}
                    isOptimizing={isOptimizing}
                    elapsedSeconds={optimizationElapsedSeconds}
                    lastDurationSeconds={lastOptimizationDurationSeconds}
                    hasResult={Boolean(optimizationStatus)}
                    onRun={handleOptimizeClick}
                    onCancel={async () => {
                        try {
                            await cancelDrifOptimization?.();
                        } catch {
                            setNotice({
                                type: "error",
                                message:
                                    "Nie udało się zatrzymać analizy. Zakończy się po upływie limitu czasu.",
                            });
                        }
                    }}
                />
                <OptimizerReportColumn
                    active={activeMobileColumn === "result"}
                    advisory={optimizerSettings.mode === "ADVISOR"}
                    isOptimizing={isOptimizing}
                    elapsedSeconds={optimizationElapsedSeconds}
                    status={optimizationStatus}
                    lastDurationSeconds={lastOptimizationDurationSeconds}
                    currentDetails={currentModDetails}
                    displayedVariant={displayedVariant}
                    maxCaps={gameRules?.drifMaxCaps}
                    translations={gameRules?.bonusTranslations}
                    activeVariantIndex={activeVariantIndex}
                    onSelectVariant={(_variant, variantIndex) =>
                        setActiveVariantIndex(variantIndex)
                    }
                    onApplyVariant={handleApplyVariant}
                />
            </div>
        </div>
    );
};

export default OptimizerPanel;
