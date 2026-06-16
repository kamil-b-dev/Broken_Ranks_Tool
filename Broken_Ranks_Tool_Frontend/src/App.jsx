import { useState, useMemo } from "react";
import GearSlot from "./components/GearSlot";
import ItemDatabase from "./components/ItemDatabase";
import StatsPanel from "./components/StatsPanel";
import CharacterPanel from "./components/CharacterPanel";
import { useEquipment } from "./context/EquipmentContext";

const SLOTS = [
    { key: "helmet", label: "Hełm", cat: "HELMET" },
    { key: "armor", label: "Zbroja", cat: "ARMOR" },
    { key: "cape", label: "Peleryna", cat: "CAPE" },
    { key: "legs", label: "Spodnie", cat: "LEGS" },
    { key: "boots", label: "Buty", cat: "BOOTS" },
    { key: "gloves", label: "Rękawice", cat: "GLOVES" },
    { key: "belt", label: "Pas", cat: "BELT" },
    { key: "weapon", label: "Broń", cat: ["WEAPON_1H", "WEAPON_2H", "WEAPON_RANGED", "RANGED_WEAPON", "RANGED"] },
    { key: "shield", label: "Druga ręka", cat: ["SHIELD","OFF_HAND"] },
    { key: "ring1", label: "Pierścień 1", cat: "RING" },
    { key: "ring2", label: "Pierścień 2", cat: "RING" },
    { key: "necklace", label: "Naszyjnik", cat: "NECKLACE" },
];

function App() {
    const [activeTab, setActiveTab] = useState("database");

    const {
        data,
        categoryNames,
        gameRules,
        requestData,
        stats,
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
        <div className="w-full max-w-[1600px] mx-auto p-6 flex flex-col gap-6 font-serif">
            <div className="grid grid-cols-1 xl:grid-cols-10 gap-6">
                <div className="xl:col-span-7 bg-gradient-to-b from-stone-900 to-black p-6 border-2 border-stone-800 shadow-[0_0_30px_rgba(0,0,0,0.9)] flex flex-col">
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
                            />
                        ))}
                    </div>
                </div>

                <div className="xl:col-span-3 flex flex-col gap-4 relative min-h-[600px] xl:min-h-0">
                    <div className="flex bg-black/60 p-1 border border-stone-800 shadow-[inset_0_0_10px_rgba(0,0,0,1)] shrink-0">
                        <button
                            onClick={() => setActiveTab("database")}
                            className={`flex-1 py-3 text-sm font-bold uppercase tracking-widest transition-all ${
                                activeTab === "database"
                                    ? "bg-stone-800 border-b-2 border-stone-400 text-stone-200"
                                    : "text-stone-500 hover:text-stone-300 hover:bg-stone-900/50 border-b-2 border-transparent"
                            }`}
                        >
                            Baza Przedmiotów
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
                                gameRules={gameRules || {}}
                            />
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