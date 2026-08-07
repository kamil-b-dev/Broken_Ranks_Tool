import { useState, useMemo } from "react";
import GearSlot from "./components/GearSlot";
import ItemDatabase from "./components/ItemDatabase";
import StatsPanel from "./components/StatsPanel";
import CharacterPanel from "./components/CharacterPanel";
import OptimizerPanel from "./components/OptimizerPanel";
import { useEquipment } from "./context/EquipmentContext";
import { SLOTS } from "./constants/equipment";

/**
 * Główny komponent aplikacji, który orkiestruje wszystkie pod-komponenty.
 * Odpowiada za główny layout, pobieranie danych z kontekstu i przekazywanie ich
 * do odpowiednich komponentów potomnych.
 *
 * @returns {JSX.Element} Wyrenderowany główny widok aplikacji
 */
function App() {
    const [activeTab, setActiveTab] = useState("database");

    const {
        data,
        categoryNames,
        orbCategories,
        drifCategories,
        gameRules,
        requestData,
        stats,
        optimizationTrigger,
        handleSlotUpdate,
        handleCharacterStatsUpdate,
        calculateStats
    } = useEquipment();

    const itemsBySlot = useMemo(() => {
        const grouped = {};
        if (!data?.items) return grouped;

        SLOTS.forEach(slot => {
            grouped[slot.key] = data.items.filter(i =>
                Array.isArray(slot.cat)
                    ? slot.cat.includes(i.category?.toUpperCase())
                    : i.category?.toUpperCase() === slot.cat
            );
        });
        return grouped;
    }, [data.items]);

    return (
        <div className="w-full max-w-[1920px] mx-auto p-4 xl:p-8 flex flex-col gap-6 xl:gap-8 font-serif">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 xl:gap-8">
                <div className="xl:col-span-8 bg-gradient-to-b from-stone-900 to-black p-6 xl:p-8 border-2 border-stone-800 shadow-[0_0_30px_rgba(0,0,0,0.9)] flex flex-col">
                    <h1 className="text-3xl font-bold text-center text-stone-300 uppercase tracking-[0.2em] mb-8 shrink-0 border-b-4 border-double border-red-900/70 pb-4 drop-shadow-[0_2px_5px_rgba(0,0,0,1)]">
                        Broken Ranks Tool
                    </h1>

                    <div className="flex flex-wrap justify-center gap-4 xl:gap-6 pb-4">
                        {SLOTS.map((slot) => (
                            <GearSlot
                                key={slot.key}
                                slotKey={slot.key}
                                label={slot.label}
                                items={itemsBySlot[slot.key] || []}
                                orbs={data.orbs}
                                drifs={data.drifs}
                                allSlots={requestData.slots || {}}
                                onUpdate={handleSlotUpdate}
                                gameRules={gameRules}
                                optimizationTrigger={optimizationTrigger}
                            />
                        ))}
                    </div>
                </div>

                <div className="xl:col-span-4 flex flex-col gap-4 relative min-h-[600px] xl:min-h-0">
                    <div className="flex bg-black/60 p-1 border border-stone-800 shadow-[inset_0_0_10px_rgba(0,0,0,1)] shrink-0">
                        <button
                            onClick={() => setActiveTab("database")}
                            className={`flex-1 py-3 text-sm font-bold uppercase tracking-widest transition-all ${
                                activeTab === "database"
                                    ? "bg-stone-800 border-b-2 border-stone-400 text-stone-200"
                                    : "text-stone-500 hover:text-stone-300 hover:bg-stone-900/50 border-b-2 border-transparent"
                            }`}
                        >
                            Baza Przedmiotow
                        </button>
                        <button
                            onClick={() => setActiveTab("optimizer")}
                            className={`flex-1 py-3 text-sm font-bold uppercase tracking-widest transition-all ${
                                activeTab === "optimizer"
                                    ? "bg-purple-950/40 border-b-2 border-purple-700 text-purple-400"
                                    : "text-stone-500 hover:text-stone-300 hover:bg-stone-900/50 border-b-2 border-transparent"
                            }`}
                        >
                            Optymalizator
                        </button>
                        <button
                            onClick={() => setActiveTab("character")}
                            className={`flex-1 py-3 text-sm font-bold uppercase tracking-widest transition-all ${
                                activeTab === "character"
                                    ? "bg-amber-950/40 border-b-2 border-amber-700 text-amber-500"
                                    : "text-stone-500 hover:text-stone-300 hover:bg-stone-900/50 border-b-2 border-transparent"
                            }`}
                        >
                            Statystyki Postaci
                        </button>
                    </div>

                    <div className="relative flex-1">
                        <div className={`xl:absolute xl:inset-0 flex flex-col w-full h-full ${activeTab === "database" ? "flex" : "hidden"}`}>
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
                        <div className={`xl:absolute xl:inset-0 flex flex-col w-full h-full ${activeTab === "optimizer" ? "flex" : "hidden"}`}>
                            <OptimizerPanel />
                        </div>
                        <div className={`xl:absolute xl:inset-0 flex flex-col w-full h-full ${activeTab === "character" ? "flex" : "hidden"}`}>
                            <CharacterPanel onStatsChange={handleCharacterStatsUpdate} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="w-full">
                <StatsPanel stats={stats} onCalculate={calculateStats} gameRules={gameRules} />
            </div>
        </div>
    );
}

export default App;