import { useMemo } from "react";
import CharacterPanel from "../CharacterPanel";
import GearSlot from "../GearSlot";
import ItemDatabase from "../ItemDatabase";
import StatsPanel from "../StatsPanel";
import { SLOTS } from "../../constants/equipment";

/**
 * Presents the manual build workflow and its calculated statistics.
 *
 * @param {object} props Workspace properties.
 * @returns {JSX.Element} Manual equipment builder workspace.
 */
const BuilderWorkspace = ({
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

    return (
        <main className="builder-theme flex w-full flex-1 flex-col gap-4 xl:gap-5">
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
                    <div className="flex flex-wrap justify-center gap-4 pt-2 pb-3 xl:gap-6">
                        {SLOTS.map((slot) => (
                            <GearSlot
                                key={slot.key}
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
                        ))}
                    </div>
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
