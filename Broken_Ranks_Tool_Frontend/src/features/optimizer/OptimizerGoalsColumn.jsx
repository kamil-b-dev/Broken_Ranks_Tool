import ReorganizationGoalsPanel from "./reorganization/ReorganizationGoalsPanel";
import { useTranslation } from "../../shared/i18n/useTranslation";
import AdvisorGoalsPanel from "./advisor/AdvisorGoalsPanel";
import OptimizerBonusColumn from "./OptimizerBonusColumn";
import OptimizerPriorityList from "./OptimizerPriorityList";
import OptimizerPriorityToolbar from "./OptimizerPriorityToolbar";
import OptimizerRunAction from "./OptimizerRunAction";
import SimpleProfileGoalsPanel from "./simple-profile/SimpleProfileGoalsPanel";

/** Editable goals, priorities, settings, and execution controls. */
const OptimizerGoalsColumn = ({
    activeMobileColumn,
    settings,
    onSettingsChange,
    stats,
    gameRules,
    priorities,
    priorityCount = priorities.length,
    availableBonuses,
    searchQuery,
    selectedCategory,
    categoryLabels,
    onSearchChange,
    onCategoryChange,
    onSelectBonus,
    sortDirection,
    categorySorted,
    hiddenPriorityCategories,
    priorityCategoryCounts,
    expandedPriorities,
    currentDetails,
    onTogglePriority,
    onRemovePriority,
    onUpdatePriority,
    configFiles,
    onSort,
    onSortCategories,
    onTogglePriorityCategory,
    onShowAllPriorityCategories,
    onToggleExpanded,
    onClear,
    isOptimizing,
    elapsedSeconds,
    startedAt,
    lastDurationSeconds,
    hasResult,
    onRun,
    onCancel,
    reorganizationStatus,
}) => {
    const { t } = useTranslation();
    return (
        <section
            className={`optimizer-workspace-column optimizer-goals-column ${["bonuses", "priorities"].includes(activeMobileColumn) ? "flex" : "hidden"} flex-col lg:flex`}
            aria-labelledby="optimizer-goals-heading"
        >
            <header className="optimizer-column-heading optimizer-goals-heading">
                <div>
                    <span className="optimizer-heading-icon" aria-hidden="true">
                        ◉
                    </span>
                    <h3 id="optimizer-goals-heading">
                        {t(settings.mode === "REORGANIZE" ? "Zadanie" : "Cele optymalizacji")}
                    </h3>
                </div>
            </header>
            {settings.mode === "ADVISOR" ? (
                <AdvisorGoalsPanel
                    stats={stats || {}}
                    gameRules={gameRules}
                    settings={settings}
                    onChange={onSettingsChange}
                />
            ) : settings.mode === "REORGANIZE" ? (
                <ReorganizationGoalsPanel
                    settings={settings}
                    onChange={onSettingsChange}
                    disabled={isOptimizing}
                    result={reorganizationStatus}
                />
            ) : settings.configurationMode === "SIMPLE" ? (
                <SimpleProfileGoalsPanel settings={settings} onChange={onSettingsChange} />
            ) : (
                <div className="optimizer-goals-workspace">
                    <OptimizerBonusColumn
                        active={activeMobileColumn === "bonuses"}
                        bonuses={availableBonuses}
                        searchQuery={searchQuery}
                        selectedCategory={selectedCategory}
                        categoryLabels={categoryLabels}
                        onSearchChange={onSearchChange}
                        onCategoryChange={onCategoryChange}
                        onSelect={onSelectBonus}
                    />
                    <div
                        className={`optimizer-priority-column ${activeMobileColumn === "priorities" ? "flex" : "hidden"} min-h-0 flex-col lg:flex`}
                    >
                        <OptimizerPriorityToolbar
                            fileInputRef={configFiles.inputRef}
                            priorityCount={priorityCount}
                            sortDirection={sortDirection}
                            categorySorted={categorySorted}
                            hiddenCategories={hiddenPriorityCategories}
                            categoryCounts={priorityCategoryCounts}
                            anyExpanded={expandedPriorities.size > 0}
                            onLoad={configFiles.load}
                            onSave={configFiles.save}
                            onSort={onSort}
                            onSortCategories={onSortCategories}
                            onToggleCategory={onTogglePriorityCategory}
                            onShowAllCategories={onShowAllPriorityCategories}
                            onToggleExpanded={onToggleExpanded}
                            onClear={onClear}
                        />
                        <OptimizerPriorityList
                            priorities={priorities}
                            hiddenCount={priorityCount - priorities.length}
                            expandedPriorities={expandedPriorities}
                            currentDetails={settings.mode === "REORGANIZE" ? [] : currentDetails}
                            maxCaps={gameRules?.drifMaxCaps}
                            onToggle={onTogglePriority}
                            onRemove={onRemovePriority}
                            onUpdate={onUpdatePriority}
                            configurationMode={
                                settings.mode === "REORGANIZE"
                                    ? "ADVANCED"
                                    : settings.configurationMode || "ADVANCED"
                            }
                        />
                    </div>
                </div>
            )}
            <OptimizerRunAction
                priorityCount={
                    ["ADVISOR", "REORGANIZE"].includes(settings.mode)
                        ? 1
                        : settings.mode !== "REORGANIZE" && settings.configurationMode === "SIMPLE"
                          ? 1
                          : priorityCount
                }
                isOptimizing={isOptimizing}
                disabled={Boolean(
                    settings.mode === "REORGANIZE" &&
                    reorganizationStatus?.applied &&
                    reorganizationStatus.reorganizationOptions &&
                    reorganizationStatus.reorganizationOptions.task !== "ARRANGE"
                )}
                elapsedSeconds={elapsedSeconds}
                startedAt={startedAt}
                lastDurationSeconds={lastDurationSeconds}
                hasResult={hasResult}
                onRun={onRun}
                onCancel={onCancel}
                mode={settings.mode}
                simple={
                    settings.mode === "BUILD_FROM_SCRATCH" &&
                    settings.configurationMode === "SIMPLE"
                }
            />
        </section>
    );
};

export default OptimizerGoalsColumn;
