import { useState, useEffect } from "react";
import axios from "axios";
import GearSlot from "./components/GearSlot";

const API_URL = "http://localhost:8080/api";

const SLOTS = [
    { key: "helmet", label: "Hełm", cat: "HELMET" },
    { key: "armor", label: "Zbroja", cat: "ARMOR" },
    { key: "cape", label: "Peleryna", cat: "CAPE" },
    { key: "legs", label: "Spodnie", cat: "LEGS" },
    { key: "boots", label: "Buty", cat: "BOOTS" },
    { key: "gloves", label: "Rękawice", cat: "GLOVES" },
    { key: "belt", label: "Pas", cat: "BELT" },
    { key: "weapon", label: "Broń", cat: "WEAPON" },
    { key: "shield", label: "Druga ręka", cat: ["SHIELD","OFF_HAND"] },
    { key: "ring1", label: "Pierścień 1", cat: "RING" },
    { key: "ring2", label: "Pierścień 2", cat: "RING" },
    { key: "necklace", label: "Naszyjnik", cat: "NECKLACE" },
];

function App() {
    const [data, setData] = useState({ items: [], orbs: [], drifs: [] });
    const [requestData, setRequestData] = useState({});
    const [stats, setStats] = useState(null);

    // Pobieranie danych z Javy przy starcie strony
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [itemsRes, orbsRes, drifsRes] = await Promise.all([
                    axios.get(`${API_URL}/items`),
                    axios.get(`${API_URL}/orbs`),
                    axios.get(`${API_URL}/drifs`),
                ]);
                setData({ items: itemsRes.data, orbs: orbsRes.data, drifs: drifsRes.data });
            } catch (error) {
                console.error("Błąd połączenia z Javą (czy backend działa?)", error);
            }
        };
        fetchData();
    }, []);

    // Aktualizacja stanu gdy użytkownik wybierze coś w slocie
    const handleSlotUpdate = (slotKey, slotData) => {
        setRequestData((prev) => ({
            ...prev,
            [`${slotKey}Id`]: slotData.itemId,
            [`${slotKey}OrbId`]: slotData.orbId,
            [`${slotKey}Drifs`]: slotData.drifIds,
        }));
    };

    // Wysłanie zapytania do kalkulatora
    const calculateStats = async () => {
        try {
            const response = await axios.post(`${API_URL}/calculator/calculate`, requestData);
            setStats(response.data);
        } catch (error) {
            console.error("Błąd podczas przeliczania statystyk", error);
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-6 flex flex-col md:flex-row gap-6">

            {/* Lewa kolumna - Ekwipunek */}
            <div className="flex-[2] bg-neutral-800 p-6 rounded-xl shadow-lg border border-neutral-700">
                <h1 className="text-3xl font-bold text-center text-orange-500 mb-6">
                    Broken Ranks Tool
                </h1>

                {/* KONTENER FLEX - układa kafelki poziomo */}
                <div className="flex flex-wrap justify-center gap-6">
                    {SLOTS.map((slot) => (
                        <GearSlot
                            key={slot.key}
                            slotKey={slot.key}
                            label={slot.label}
                            items={data.items.filter(i =>
                                Array.isArray(slot.cat)
                                    ? slot.cat.includes(i.category.toUpperCase())
                                    : i.category.toUpperCase() === slot.cat
                            )}
                            orbs={data.orbs}
                            drifs={data.drifs}
                            onUpdate={handleSlotUpdate}
                        />
                    ))}
                </div>
            </div>

            {/* Prawa kolumna - Statystyki */}
            <div className="flex-1 bg-neutral-800 p-6 rounded-xl shadow-lg border border-neutral-700 sticky top-6 h-fit">
                <h3 className="text-2xl font-bold border-b-2 border-orange-600 pb-3 mb-4 text-white">
                    Statystyki
                </h3>

                <button
                    className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg text-lg transition-colors mb-6 shadow-md"
                    onClick={calculateStats}
                >
                    PRZELICZ STATYSTYKI
                </button>

                <div className="space-y-2">
                    {stats ? Object.entries(stats).sort().map(([key, val]) => (
                        <div key={key} className="flex justify-between border-b border-neutral-700 pb-2">
                            <span className="text-gray-300">{key}</span>
                            <span className="text-yellow-400 font-bold">{val}</span>
                        </div>
                    )) : <p className="text-center text-gray-500">Wybierz sprzęt i kliknij przelicz...</p>}
                </div>
            </div>
        </div>
    );
}

export default App;