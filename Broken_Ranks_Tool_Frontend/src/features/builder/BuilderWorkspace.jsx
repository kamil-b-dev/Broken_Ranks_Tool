import { useTranslation } from "../../shared/i18n/useTranslation";
import "./styles/builder-layout.css";
import "./styles/equipment-figure.css";
import "./styles/builder-controls.css";
import "./styles/builder-responsive.css";
import "./styles/builder-theme.css";
import "../../shared/styles/equipment-icons.css";
import "../../shared/styles/workbench.css";
import { maximizeStoneLevels } from "./maximizeStoneLevels";
import { useState } from "react";
import { useBuilderWorkspace } from "./useBuilderWorkspace";
import CharacterPanel from "./character/CharacterPanel";
import ItemDatabase from "./item-database/ItemDatabase";
import StatsPanel from "./stats-panel/StatsPanel";
import BuilderEquipmentWorkbench from "./BuilderEquipmentWorkbench";
import SelectedSlotEditor from "./gear-slot/SelectedSlotEditor";
import BackpackGrid from "./backpack/BackpackGrid";
import BackpackEditor from "./backpack/BackpackEditor";
import { useBackpackWorkspace } from "./backpack/useBackpackWorkspace";
import "./backpack/backpack.css";
import BackpackSourcePanel from "./backpack/BackpackSourcePanel";

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
    backpack = [],
    onBackpackChange,
    equipBackpackEntry,
    getBackpackEquipWarning,
    backpackEquipNotice,
    equipmentRemoval,
    backpackImportRevision,
}) => {
    const { t } = useTranslation();

    const [resourceSource, setResourceSource] = useState("database");
    const [equipmentView, setEquipmentView] = useState("character");
    const backpackModel = useBackpackWorkspace({
        entries: backpack,
        onChange: onBackpackChange,
        data,
        gameRules: gameRules || {},
        importRevision: backpackImportRevision,
    });
    const model = useBuilderWorkspace({ items: data.items, slots: requestData.slots });
    const [levelWarnings, setLevelWarnings] = useState([]);
    const maximizeLevels = (kind) => {
        const { updates, warnings } = maximizeStoneLevels({
            slots: requestData.slots,
            ...data,
            gameRules: gameRules || {},
            kind,
        });
        Object.entries(updates).forEach(([key, slot]) => onSlotUpdate(key, slot));
        setLevelWarnings(warnings);
        setSlotDropRevision((revision) => revision + 1);
    };
    const [slotDropRevision, setSlotDropRevision] = useState(0);
    const handleOverviewItemDrop = (slot, item) => {
        if (item.source === "backpack") {
            if (equipBackpackEntry?.(item.entryId, slot.key)) model.selectSlot(slot);
            return;
        }
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
                onStatsChange={onCharacterStatsUpdate}
                externalConfig={characterConfig}
                externalStats={requestData.characterStats}
                syncTrigger={optimizationTrigger}
            />
            <div className="builder-workspace-grid">
                <aside className="builder-database-column">
                    <div className="builder-resource-panel">
                        <div
                            className="builder-resource-switch"
                            role="group"
                            aria-label={t("Źródło wyposażenia")}
                        >
                            <button
                                type="button"
                                aria-pressed={resourceSource === "database"}
                                onClick={() => setResourceSource("database")}
                            >
                                {t("Baza danych")}
                            </button>
                            <button
                                type="button"
                                aria-pressed={resourceSource === "backpack"}
                                onClick={() => setResourceSource("backpack")}
                            >
                                {t("Plecak")}
                            </button>
                        </div>
                        {resourceSource === "backpack" ? (
                            <BackpackSourcePanel
                                entries={backpack}
                                data={data}
                                gameRules={gameRules || {}}
                                activeSlot={model.activeSlot}
                                onEquip={equipBackpackEntry}
                                getWarning={getBackpackEquipWarning}
                            />
                        ) : (
                            <ItemDatabase
                                items={data.items}
                                orbs={data.orbs}
                                drifs={data.drifs}
                                categoryNames={categoryNames}
                                orbCategories={orbCategories}
                                drifCategories={drifCategories}
                                gameRules={gameRules || {}}
                            />
                        )}
                    </div>
                </aside>
                <BuilderEquipmentWorkbench
                    model={model}
                    data={data}
                    requestData={requestData}
                    gameRules={gameRules}
                    onOverviewItemDrop={handleOverviewItemDrop}
                    getBackpackEquipWarning={getBackpackEquipWarning}
                    onMaximizeLevels={maximizeLevels}
                    equipmentRemoval={equipmentRemoval}
                    levelWarnings={levelWarnings}
                    equipmentView={equipmentView}
                    onEquipmentViewChange={setEquipmentView}
                    backpackContent={
                        <BackpackGrid
                            entries={backpack}
                            data={data}
                            gameRules={gameRules || {}}
                            model={backpackModel}
                        />
                    }
                >
                    {backpackEquipNotice && (
                        <p className="backpack-warning" role="alert">
                            {t(backpackEquipNotice)}
                        </p>
                    )}
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
                    {equipmentView === "backpack" ? (
                        <BackpackEditor
                            model={backpackModel}
                            data={data}
                            gameRules={gameRules || {}}
                            syncTrigger={optimizationTrigger}
                        />
                    ) : (
                        <SelectedSlotEditor
                            model={model}
                            data={data}
                            requestData={requestData}
                            gameRules={gameRules}
                            optimizationTrigger={slotEditorSyncTrigger}
                            onSlotUpdate={onSlotUpdate}
                            onBackpackEquip={equipBackpackEntry}
                            getBackpackEquipWarning={getBackpackEquipWarning}
                            equipmentRemoval={equipmentRemoval}
                        />
                    )}
                </aside>
            </div>
        </main>
    );
};

export default BuilderWorkspace;
