import { useMemo, useState } from "react";
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
    const [activePanel, setActivePanel] = useState("database");

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
        <main className="builder-theme flex w-full flex-1 flex-col gap-6 xl:gap-8">
            <div className="grid flex-1 grid-cols-1 gap-6 xl:grid-cols-12 xl:gap-8">
                <section className="workbench flex flex-col p-5 md:p-6 xl:col-span-8 xl:p-8">
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

                <aside className="relative flex min-h-[600px] flex-col gap-4 xl:col-span-4 xl:min-h-0">
                    <div className="flex shrink-0 border border-stone-800 bg-black/60 p-1 shadow-[inset_0_0_10px_rgba(0,0,0,1)]">
                        <button
                            type="button"
                            onClick={() => setActivePanel("database")}
                            className={`flex-1 border-b-2 py-3 text-sm font-bold uppercase tracking-widest transition-all ${
                                activePanel === "database"
                                    ? "border-red-700 bg-red-950/70 text-stone-100"
                                    : "border-transparent text-stone-500 hover:bg-stone-900/50 hover:text-stone-300"
                            }`}
                        >
                            Baza Przedmiotów
                        </button>
                        <button
                            type="button"
                            onClick={() => setActivePanel("character")}
                            className={`flex-1 border-b-2 py-3 text-sm font-bold uppercase tracking-widest transition-all ${
                                activePanel === "character"
                                    ? "border-red-700 bg-red-950/70 text-stone-100"
                                    : "border-transparent text-stone-500 hover:bg-stone-900/50 hover:text-stone-300"
                            }`}
                        >
                            Statystyki Postaci
                        </button>
                    </div>

                    <div className="relative flex-1">
                        <div
                            className={`h-full w-full flex-col xl:absolute xl:inset-0 ${activePanel === "database" ? "flex" : "hidden"}`}
                        >
                            <ItemDatabase
                                items={data.items}
                                orbs={data.orbs}
                                drifs={data.drifs}
                                categoryNames={categoryNames}
                                orbCategories={orbCategories}
                                drifCategories={drifCategories}
                                gameRules={gameRules || {}}
                            />
                        </div>
                        <div
                            className={`h-full w-full flex-col xl:absolute xl:inset-0 ${activePanel === "character" ? "flex" : "hidden"}`}
                        >
                            <CharacterPanel
                                onStatsChange={onCharacterStatsUpdate}
                                externalConfig={characterConfig}
                                syncTrigger={optimizationTrigger}
                            />
                        </div>
                    </div>
                </aside>
            </div>

            <StatsPanel
                stats={stats}
                onCalculate={onCalculateStats}
                isCalculating={isCalculatingStats}
                gameRules={gameRules}
                statSources={statSources}
            />
        </main>
    );
};

export default BuilderWorkspace;
