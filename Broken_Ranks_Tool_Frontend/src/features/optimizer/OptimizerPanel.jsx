import { useState } from "react";
import AppNotice from "../../shared/ui/AppNotice";
import DraftSaveWarning from "../../shared/ui/DraftSaveWarning";
import OptimizerMobileNavigation from "./OptimizerMobileNavigation";
import OptimizerSettingsPanel, { OptimizerModeNavigation } from "./OptimizerSettingsPanel";
import OptimizerLocksColumn from "./OptimizerLocksColumn";
import OptimizerGoalsColumn from "./OptimizerGoalsColumn";
import OptimizerReportColumn from "./OptimizerReportColumn";
import OptimizerRunAction from "./OptimizerRunAction";
import { useOptimizerWorkspace } from "./useOptimizerWorkspace";
import { OptimizerLabelContext } from "./optimizerLabelContext";
import HelpButton from "../help/HelpButton";
import AnalysisArchive from "./archive/AnalysisArchive";
import AdvisorExclusions from "./advisor/AdvisorExclusions";
import { useProfessionOptimizerSettings } from "./useProfessionOptimizerSettings";

/** Desktop composition of equipment locks, goals, results, and execution controls. */
const OptimizerPanel = ({
    optimizerSettings: storedSettings,
    onOptimizerSettingsChange: onSettingsChange,
}) => {
    const [optimizerSettings, onOptimizerSettingsChange] = useProfessionOptimizerSettings(
        storedSettings,
        onSettingsChange
    );
    const {
        labels,
        analysisDocument,
        gameRules,
        drifCategories,
        requestData,
        data,
        lockedSlots,
        lockedDrifs,
        toggleSlotLock,
        toggleDrifLock,
        stats,
        prioritizedBonuses,
        displayedPriorities,
        availableBonuses,
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
        prioritySortDirection,
        categorySorted,
        hiddenPriorityCategories,
        priorityCategoryCounts,
        expandedPriorities,
        selectBonus,
        removeBonus,
        clearAll,
        updateBonus,
        sortByPriority,
        toggleCategorySorting,
        togglePriorityCategory,
        showAllPriorityCategories,
        toggleExpanded,
        toggleAllExpanded,
        isOptimizing,
        optimizationElapsedSeconds,
        optimizationStartedAt,
        lastOptimizationDurationSeconds,
        optimizationStatus,
        displayedStatus,
        activeVariantIndex,
        setActiveVariantIndex,
        notice,
        setNotice,
        configFiles,
        draftSave,
        currentModDetails,
        reportModDetails,
        displayedVariant,
        handleOptimizeClick,
        handleApplyVariant,
        handleCancel,
        reorganizationCheck,
        canUndoReorganization,
        reorganizationUndoWarning,
        handleUndoReorganization,
    } = useOptimizerWorkspace({ optimizerSettings, onOptimizerSettingsChange });
    const [activeMobileColumn, setActiveMobileColumn] = useState("priorities");
    return (
        <OptimizerLabelContext.Provider value={labels}>
            <div
                className={`optimizer-console ${optimizerSettings.mode === "REORGANIZE" ? "is-reorganization" : ""}`}
            >
                <OptimizerModeNavigation
                    settings={optimizerSettings}
                    onChange={onOptimizerSettingsChange}
                />
                <div className="help-workspace-action">
                    <HelpButton
                        topic={
                            optimizerSettings.mode === "ADVISOR"
                                ? "advisor"
                                : optimizerSettings.mode === "REORGANIZE"
                                  ? "reorganization"
                                  : "optimizer"
                        }
                    />
                </div>
                <OptimizerSettingsPanel
                    settings={optimizerSettings}
                    onChange={onOptimizerSettingsChange}
                />
                <AppNotice
                    notice={
                        notice ? { ...notice, message: labels.formatText(notice.message) } : notice
                    }
                    onDismiss={() => setNotice(null)}
                />
                <DraftSaveWarning
                    failed={draftSave?.saveFailed}
                    message="Nie udało się automatycznie zapisać ustawień optymalizatora. Ponów zapis lub pobierz konfigurację do pliku."
                    onRetry={draftSave?.retrySave}
                    onDownload={configFiles.save}
                />
                <OptimizerMobileNavigation
                    activeColumn={activeMobileColumn}
                    priorityCount={
                        optimizerSettings.mode === "BUILD_FROM_SCRATCH" &&
                        optimizerSettings.configurationMode === "SIMPLE"
                            ? 1
                            : prioritizedBonuses.length
                    }
                    onChange={setActiveMobileColumn}
                    mode={optimizerSettings.mode}
                    configurationMode={optimizerSettings.configurationMode}
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
                        exclusions={
                            optimizerSettings.mode === "ADVISOR" && (
                                <AdvisorExclusions
                                    settings={optimizerSettings}
                                    onChange={onOptimizerSettingsChange}
                                    data={data}
                                    gameRules={gameRules}
                                />
                            )
                        }
                    />

                    <OptimizerGoalsColumn
                        activeMobileColumn={activeMobileColumn}
                        settings={optimizerSettings}
                        onSettingsChange={onOptimizerSettingsChange}
                        stats={stats}
                        gameRules={gameRules}
                        priorities={displayedPriorities}
                        priorityCount={prioritizedBonuses.length}
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
                        categorySorted={categorySorted}
                        hiddenPriorityCategories={hiddenPriorityCategories}
                        priorityCategoryCounts={priorityCategoryCounts}
                        expandedPriorities={expandedPriorities}
                        currentDetails={currentModDetails}
                        onTogglePriority={toggleExpanded}
                        onRemovePriority={removeBonus}
                        onUpdatePriority={updateBonus}
                        configFiles={configFiles}
                        onSort={sortByPriority}
                        onSortCategories={toggleCategorySorting}
                        onTogglePriorityCategory={togglePriorityCategory}
                        onShowAllPriorityCategories={showAllPriorityCategories}
                        onToggleExpanded={toggleAllExpanded}
                        onClear={clearAll}
                        isOptimizing={isOptimizing}
                        reorganizationStatus={displayedStatus}
                    />
                    <OptimizerReportColumn
                        archive={
                            <AnalysisArchive
                                document={analysisDocument}
                                busy={isOptimizing}
                                data={data}
                                gameRules={gameRules}
                            />
                        }
                        active={activeMobileColumn === "result"}
                        advisory={optimizerSettings.mode === "ADVISOR"}
                        isOptimizing={isOptimizing}
                        elapsedSeconds={optimizationElapsedSeconds}
                        startedAt={optimizationStartedAt}
                        status={displayedStatus}
                        lastDurationSeconds={lastOptimizationDurationSeconds}
                        currentDetails={reportModDetails}
                        displayedVariant={displayedVariant}
                        maxCaps={gameRules?.drifMaxCaps}
                        translations={gameRules?.bonusTranslations}
                        activeVariantIndex={activeVariantIndex}
                        onSelectVariant={(_variant, variantIndex) =>
                            setActiveVariantIndex(variantIndex)
                        }
                        onApplyVariant={handleApplyVariant}
                        canUndoReorganization={canUndoReorganization}
                        reorganizationUndoWarning={reorganizationUndoWarning}
                        onUndoReorganization={handleUndoReorganization}
                    />
                </div>
            </div>
            <div className="optimizer-run-bar">
                <OptimizerRunAction
                    priorityCount={
                        ["ADVISOR", "REORGANIZE"].includes(optimizerSettings.mode) ||
                        (optimizerSettings.mode === "BUILD_FROM_SCRATCH" &&
                            optimizerSettings.configurationMode === "SIMPLE")
                            ? 1
                            : prioritizedBonuses.length
                    }
                    isOptimizing={isOptimizing}
                    disabled={Boolean(
                        optimizerSettings.mode === "REORGANIZE" &&
                        (reorganizationCheck?.blocked ||
                            reorganizationCheck?.alreadySatisfied ||
                            (displayedStatus?.applied &&
                                displayedStatus.reorganizationOptions &&
                                displayedStatus.reorganizationOptions.task !== "ARRANGE"))
                    )}
                    elapsedSeconds={optimizationElapsedSeconds}
                    startedAt={optimizationStartedAt}
                    lastDurationSeconds={lastOptimizationDurationSeconds}
                    hasResult={Boolean(optimizationStatus)}
                    onRun={handleOptimizeClick}
                    onCancel={handleCancel}
                    mode={optimizerSettings.mode}
                    simple={
                        optimizerSettings.mode === "BUILD_FROM_SCRATCH" &&
                        optimizerSettings.configurationMode === "SIMPLE"
                    }
                />
            </div>
        </OptimizerLabelContext.Provider>
    );
};

export default OptimizerPanel;
