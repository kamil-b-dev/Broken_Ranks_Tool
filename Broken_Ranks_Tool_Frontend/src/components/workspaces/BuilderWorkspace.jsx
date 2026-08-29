import { useMemo, useState } from "react";
import CharacterPanel from "../CharacterPanel";
import GearSlot from "../GearSlot";
import ItemDatabase from "../ItemDatabase";
import StatsPanel from "../StatsPanel";
import EquipmentSlotOverview from "../equipment/EquipmentSlotOverview";
import { SLOTS } from "../../constants/equipment";
import equipmentSilhouette from "../../assets/equipment-silhouette.png";

/**
 * Presents the manual build workflow and its calculated statistics.
 *
 * @param {object} props Workspace properties.
 * @returns {JSX.Element} Manual equipment builder workspace.
 */
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
    const [activeSlotKey, setActiveSlotKey] = useState(SLOTS[0].key);

    const itemsBySlot = useMemo(() => {
        const grouped = {};
        if (!data?.items) return grouped;

        SLOTS.forEach((slot) => {
            grouped[slot.key] = data.items.filter((item) =>
                Array.isArray(slot.cat)
                    ? slot.cat.includes(item.category?.toUpperCase())
                    : item.category?.toUpperCase() === slot.cat
            );
        });
        return grouped;
    }, [data.items]);

    const itemsById = useMemo(
        () => new Map((data.items || []).map((item) => [String(item.id), item])),
        [data.items]
    );
    const activeSlot = SLOTS.find((slot) => slot.key === activeSlotKey) || SLOTS[0];
    const activeSlotData = requestData.slots?.[activeSlot.key];
    const activeItem = activeSlotData?.itemId ? itemsById.get(String(activeSlotData.itemId)) : null;
    const equippedSlotCount = SLOTS.filter((slot) => requestData.slots?.[slot.key]?.itemId).length;

    const renderSlotOverview = (slot) => {
        const slotData = requestData.slots?.[slot.key];
        const item = slotData?.itemId ? itemsById.get(String(slotData.itemId)) : null;

        return (
            <EquipmentSlotOverview
                key={slot.key}
                label={slot.label}
                slotData={slotData}
                item={item}
                active={slot.key === activeSlot.key}
                onSelect={() => setActiveSlotKey(slot.key)}
            />
        );
    };

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

                <section className="workbench builder-equipment-column flex flex-col p-5 md:p-6">
                    <div className="workbench-heading">
                        <div>
                            <p className="section-kicker">Konfiguracja</p>
                            <h2>Ekwipunek</h2>
                        </div>
                        <p className="workbench-help">
                            Wybierz przedmiot lub przeciągnij go z bazy. Karmazynowa obwódka oznacza
                            aktywne pole.
                        </p>
                    </div>
                    <div className="equipment-figure-heading" aria-live="polite">
                        <span>Ekwipunek</span>
                        <strong>
                            {equippedSlotCount}/{SLOTS.length}
                        </strong>
                    </div>
                    <div className="equipment-figure-layout">
                        <div className="equipment-slot-column">
                            {SLOTS.slice(0, 6).map(renderSlotOverview)}
                        </div>
                        <figure className="equipment-character-figure" aria-hidden="true">
                            <span className="equipment-figure-aura" />
                            <img src={equipmentSilhouette} alt="" />
                        </figure>
                        <div className="equipment-slot-column">
                            {SLOTS.slice(6).map(renderSlotOverview)}
                        </div>
                    </div>

                    <section className="selected-slot-editor" aria-label="Edytor wybranego slotu">
                        <div className="selected-slot-editor-heading">
                            <div>
                                <p className="section-kicker">Edytowany slot</p>
                                <h3>{activeSlot.label}</h3>
                            </div>
                            <span>{activeItem?.name || "Brak wybranego przedmiotu"}</span>
                        </div>

                        <div className="selected-slot-editor-content">
                            {SLOTS.map((slot) => (
                                <div
                                    key={slot.key}
                                    className={slot.key === activeSlot.key ? "block" : "hidden"}
                                >
                                    <GearSlot
                                        expanded
                                        slotKey={slot.key}
                                        label={slot.label}
                                        items={itemsBySlot[slot.key] || []}
                                        orbs={data.orbs}
                                        drifs={data.drifs}
                                        allSlots={requestData.slots || {}}
                                        onUpdate={onSlotUpdate}
                                        gameRules={gameRules}
                                        optimizationTrigger={optimizationTrigger}
                                    />
                                </div>
                            ))}
                        </div>
                    </section>
                </section>

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
