import { useBuilderWorkspace } from "../../hooks/useBuilderWorkspace";
import CharacterPanel from "../character/CharacterPanel";
import ItemDatabase from "../item_database/ItemDatabase";
import StatsPanel from "../stats_panel/StatsPanel";
import BuilderEquipmentWorkbench from "./BuilderEquipmentWorkbench";

/** Composes the manual equipment builder workflow. */
const BuilderWorkspace = ({
    active = true,
    data,
    categoryNames,
    orbCategories,
    drifCategories,
    gameRules,
    requestData,
    stats,
    statSources,
    isCalculatingStats,
    optimizationTrigger,
    characterConfig,
    onSlotUpdate,
    onCharacterStatsUpdate,
    onCalculateStats,
}) => {
    const model = useBuilderWorkspace({ items: data.items, slots: requestData.slots });
    return (
        <main
            id={active ? "workspace-content" : undefined}
            hidden={!active}
            className={`builder-theme w-full flex-1 flex-col gap-4 xl:gap-5 ${active ? "flex" : "hidden"}`}
        >
            <CharacterPanel
                compact
                onStatsChange={onCharacterStatsUpdate}
                externalConfig={characterConfig}
                syncTrigger={optimizationTrigger}
            />
            <div className="builder-workspace-grid">
                <aside className="builder-database-column">
                    <ItemDatabase
                        items={data.items}
                        orbs={data.orbs}
                        drifs={data.drifs}
                        categoryNames={categoryNames}
                        orbCategories={orbCategories}
                        drifCategories={drifCategories}
                        gameRules={gameRules || {}}
                    />
                </aside>
                <BuilderEquipmentWorkbench
                    model={model}
                    data={data}
                    requestData={requestData}
                    gameRules={gameRules}
                    optimizationTrigger={optimizationTrigger}
                    onSlotUpdate={onSlotUpdate}
                />
                <aside className="builder-results-column">
                    <StatsPanel
                        compact
                        stats={stats}
                        onCalculate={onCalculateStats}
                        isCalculating={isCalculatingStats}
                        gameRules={gameRules}
                        statSources={statSources}
                    />
                </aside>
            </div>
        </main>
    );
};

export default BuilderWorkspace;
