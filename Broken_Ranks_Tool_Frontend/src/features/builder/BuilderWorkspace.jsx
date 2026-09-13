import { useState } from "react";
import { useBuilderWorkspace } from "./useBuilderWorkspace";
import CharacterPanel from "./character/CharacterPanel";
import ItemDatabase from "./item-database/ItemDatabase";
import StatsPanel from "./stats-panel/StatsPanel";
import BuilderEquipmentWorkbench from "./BuilderEquipmentWorkbench";
import SelectedSlotEditor from "./gear-slot/SelectedSlotEditor";

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
    const [slotDropRevision, setSlotDropRevision] = useState(0);
    const handleOverviewItemDrop = (slot, item) => {
        onSlotUpdate(slot.key, {
            itemId: String(item.id),
            itemStars: 1,
            orbIds: [],
            orbLevels: [],
            drifIds: [],
            drifLevels: {},
        });
        model.selectSlot(slot);
        setSlotDropRevision((revision) => revision + 1);
    };
    const slotEditorSyncTrigger = `${optimizationTrigger ?? ""}:${slotDropRevision}`;

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
                    onOverviewItemDrop={handleOverviewItemDrop}
                >
                    <StatsPanel
                        compact
                        stats={stats}
                        onCalculate={onCalculateStats}
                        isCalculating={isCalculatingStats}
                        gameRules={gameRules}
                        statSources={statSources}
                    />
                </BuilderEquipmentWorkbench>
                <aside className="builder-slot-editor-column">
                    <SelectedSlotEditor
                        model={model}
                        data={data}
                        requestData={requestData}
                        gameRules={gameRules}
                        optimizationTrigger={slotEditorSyncTrigger}
                        onSlotUpdate={onSlotUpdate}
                    />
                </aside>
            </div>
        </main>
    );
};

export default BuilderWorkspace;
