import { useState, useEffect } from "react";
import axios from "axios";
import GearSlot from "./components/GearSlot";
import ItemDatabase from "./components/ItemDatabase";
import StatsPanel from "./components/StatsPanel";

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
    const [requestData, setRequestData] = useState({});
    const [stats, setStats] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [itemsRes, orbsRes, drifsRes] = await Promise.all([
                    axios.get(`${API_URL}/items`),
                    axios.get(`${API_URL}/orbs`),
                    axios.get(`${API_URL}/drifs`)
                ]);
                setData({ items: itemsRes.data, orbs: orbsRes.data, drifs: drifsRes.data });
            } catch (error) {
                console.error("Błąd krytyczny: Nie udało się pobrać głównych danych z Javy!", error);
            }

            try {
                const catRes = await axios.get(`${API_URL}/dictionaries/categories`);
                setCategoryNames(catRes.data);
            } catch (error) {
                console.warn("Błąd pobierania słownika. Używam angielskich nazw.", error);
            }
        };
        fetchData();
    }, []);

    const itemsGroupedByCategory = data.items.reduce((groupedItems, item) => {
        const categoryKey = item.category || "INNE";
        const displayCategory = categoryNames[categoryKey] || categoryKey;

        if (!groupedItems[displayCategory]) {
            groupedItems[displayCategory] = [];
        }

        groupedItems[displayCategory].push(item);
        return groupedItems;
    }, {});

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
            console.error("Błąd podczas przeliczania statystyk", error);
        }
    };

    return (
        <div className="w-full max-w-[1600px] mx-auto p-6 flex flex-col gap-6">

            {/* GÓRNA SEKCJA */}
            <div className="grid grid-cols-1 xl:grid-cols-10 gap-6">

                <div className="xl:col-span-7 bg-neutral-800 p-6 rounded-xl shadow-lg border border-neutral-700 flex flex-col">
                    <h1 className="text-3xl font-bold text-center text-orange-500 mb-6 shrink-0">
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
                                onUpdate={handleSlotUpdate}
                            />
                        ))}
                    </div>
                </div>

                <div className="xl:col-span-3 relative min-h-[500px] xl:min-h-0">
                    <div className="xl:absolute xl:inset-0 flex flex-col w-full h-full">
                        <ItemDatabase groupedItems={itemsGroupedByCategory} />
                    </div>
                </div>

            </div>

            {/* DOLNA SEKCJA: Kalkulator Statystyk */}
            <div className="w-full">
                <StatsPanel stats={stats} onCalculate={calculateStats} />
            </div>

        </div>
    );
}

export default App;