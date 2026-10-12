import { useState } from "react";
import AppNotice from "../../shared/ui/AppNotice";
import OptimizerMobileNavigation from "./OptimizerMobileNavigation";
import OptimizerSettingsPanel, { OptimizerModeNavigation } from "./OptimizerSettingsPanel";
import OptimizerLocksColumn from "./OptimizerLocksColumn";
import OptimizerGoalsColumn from "./OptimizerGoalsColumn";
import OptimizerReportColumn from "./OptimizerReportColumn";
import { useOptimizerWorkspace } from "./useOptimizerWorkspace";

/** Desktop composition retains its existing markup and navigation. */
const OptimizerPanel = ({ optimizerSettings, onOptimizerSettingsChange }) => {
    const {
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
        isOptimizing,
        optimizationElapsedSeconds,
        optimizationStartedAt,
        lastOptimizationDurationSeconds,
        optimizationStatus,
        activeVariantIndex,
        setActiveVariantIndex,
        notice,
        setNotice,
        configFiles,
        currentModDetails,
        reportModDetails,
        displayedVariant,
        handleOptimizeClick,
        handleApplyVariant,
        handleCancel,
    } = useOptimizerWorkspace({ optimizerSettings, onOptimizerSettingsChange });
    const [activeMobileColumn, setActiveMobileColumn] = useState("priorities");
    return (
        <div className="optimizer-console">
            <OptimizerModeNavigation
                settings={optimizerSettings}
                onChange={onOptimizerSettingsChange}
            />
            <OptimizerSettingsPanel
                settings={optimizerSettings}
                onChange={onOptimizerSettingsChange}
            />
            <AppNotice notice={notice} onDismiss={() => setNotice(null)} />
            <OptimizerMobileNavigation
                activeColumn={activeMobileColumn}
                priorityCount={
                    optimizerSettings.configurationMode === "SIMPLE" ? 1 : prioritizedBonuses.length
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
                    startedAt={optimizationStartedAt}
                    lastDurationSeconds={lastOptimizationDurationSeconds}
                    hasResult={Boolean(optimizationStatus)}
                    onRun={handleOptimizeClick}
                    onCancel={handleCancel}
                />
                <OptimizerReportColumn
                    active={activeMobileColumn === "result"}
                    advisory={optimizerSettings.mode === "ADVISOR"}
                    isOptimizing={isOptimizing}
                    elapsedSeconds={optimizationElapsedSeconds}
                    startedAt={optimizationStartedAt}
                    status={optimizationStatus}
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
                />
            </div>
        </div>
    );
};

export default OptimizerPanel;
