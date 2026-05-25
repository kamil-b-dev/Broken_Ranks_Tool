import { useState, useEffect } from "react";
import axios from "axios";
import GearSlot from "./components/GearSlot";
import ItemDatabase from "./components/ItemDatabase";
import StatsPanel from "./components/StatsPanel";
import CharacterPanel from "./components/CharacterPanel";

const API_URL = "http://localhost:8080/api";

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
    const [data, setData] = useState({ items: [], orbs: [], drifs: [] });
    const [categoryNames, setCategoryNames] = useState({});
    const [gameRules, setGameRules] = useState(null);

    const [requestData, setRequestData] = useState({ slots: {}, characterStats: {} });
    const [stats, setStats] = useState(null);

    const [activeTab, setActiveTab] = useState("database");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [itemsRes, orbsRes, drifsRes, rulesRes] = await Promise.all([
                    axios.get(`${API_URL}/items`),
                    axios.get(`${API_URL}/orbs`),
                    axios.get(`${API_URL}/drifs`),
                    axios.get(`${API_URL}/rules`)
                ]);
                setData({ items: itemsRes.data, orbs: orbsRes.data, drifs: drifsRes.data });
                setGameRules(rulesRes.data);
            } catch (error) {
                console.error(error);
            }

            try {
                const catRes = await axios.get(`${API_URL}/dictionaries/categories`);
                setCategoryNames(catRes.data);
            } catch (error) {
                console.warn(error);
            }
        };
        fetchData();
    }, []);

    const handleSlotUpdate = (slotKey, slotData) => {
        setRequestData((prev) => ({
            ...prev,
            slots: {
                ...(prev.slots || {}),
                [slotKey]: {
                    itemId: slotData.itemId,
                    itemStars: slotData.itemStars,
                    orbId: slotData.orbId,
                    orbLevel: slotData.orbLevel,
                    drifIds: slotData.drifIds,
                    drifLevels: slotData.drifLevels,
                }
            }
        }));
    };

    const calculateStats = async () => {
        try {
            const response = await axios.post(`${API_URL}/calculator/calculate`, requestData);
            setStats(response.data);
        } catch (error) {
            console.error(error);
        }
    };

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
                                items={data.items.filter(i =>
                                    Array.isArray(slot.cat)
                                        ? slot.cat.includes(i.category?.toUpperCase())
                                        : i.category?.toUpperCase() === slot.cat
                                )}
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
                            <CharacterPanel onStatsChange={(stats) => setRequestData(prev => ({ ...prev, characterStats: stats }))} />
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