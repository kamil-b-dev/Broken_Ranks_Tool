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
    availableBonuses,
    searchQuery,
    selectedCategory,
    categoryLabels,
    onSearchChange,
    onCategoryChange,
    onSelectBonus,
    sortDirection,
    expandedPriorities,
    currentDetails,
    onTogglePriority,
    onRemovePriority,
    onUpdatePriority,
    configFiles,
    onSort,
    onToggleExpanded,
    onClear,
    isOptimizing,
    elapsedSeconds,
    lastDurationSeconds,
    hasResult,
    onRun,
    onCancel,
}) => (
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
        </header>
        {settings.mode === "ADVISOR" ? (
            <AdvisorGoalsPanel
                stats={stats || {}}
                gameRules={gameRules}
                settings={settings}
                onChange={onSettingsChange}
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
                        priorityCount={priorities.length}
                        sortDirection={sortDirection}
                        anyExpanded={expandedPriorities.size > 0}
                        onLoad={configFiles.load}
                        onSave={configFiles.save}
                        onSort={onSort}
                        onToggleExpanded={onToggleExpanded}
                        onClear={onClear}
                    />
                    <OptimizerPriorityList
                        priorities={priorities}
                        expandedPriorities={expandedPriorities}
                        currentDetails={currentDetails}
                        maxCaps={gameRules?.drifMaxCaps}
                        onToggle={onTogglePriority}
                        onRemove={onRemovePriority}
                        onUpdate={onUpdatePriority}
                        configurationMode={settings.configurationMode || "ADVANCED"}
                    />
                </div>
            </div>
        )}
        <OptimizerRunAction
            priorityCount={
                settings.mode === "ADVISOR"
                    ? 1
                    : settings.configurationMode === "SIMPLE"
                      ? Object.keys(settings.simpleAspects || {}).length
                      : priorities.length
            }
            isOptimizing={isOptimizing}
            elapsedSeconds={elapsedSeconds}
            lastDurationSeconds={lastDurationSeconds}
            hasResult={hasResult}
            onRun={onRun}
            onCancel={onCancel}
            mode={settings.mode}
            simple={settings.mode !== "ADVISOR" && settings.configurationMode === "SIMPLE"}
        />
    </section>
);

export default OptimizerGoalsColumn;
