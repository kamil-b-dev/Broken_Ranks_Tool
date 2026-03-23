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
    { key: "weapon", label: "Broń", cat: ["WEAPON_1H", "WEAPON_2H"] },
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

    // Pobieranie danych z Javy przy starcie strony
    useEffect(() => {
        const fetchData = async () => {
            // BLOK 1: Krytyczne dane (Przedmioty, Orby, Drify)
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

            // BLOK 2: Dane dodatkowe (Słownik) - Nawet jak wybuchnie, aplikacja przetrwa!
            try {
                const catRes = await axios.get(`${API_URL}/dictionaries/categories`);
                setCategoryNames(catRes.data);
            } catch (error) {
                console.warn("Błąd pobierania słownika. Używam angielskich nazw.", error);
            }
        };
        fetchData();
    }, []);

    // Grupowanie WSZYSTKICH przedmiotów z dynamicznym tłumaczeniem z Javy
    const itemsGroupedByCategory = data.items.reduce((groupedItems, item) => {
        const categoryKey = item.category || "INNE";

        // Zaglądamy do słownika pobranego z backendu
        const displayCategory = categoryNames[categoryKey] || categoryKey;

        if (!groupedItems[displayCategory]) {
            groupedItems[displayCategory] = [];
        }

        groupedItems[displayCategory].push(item);
        return groupedItems;
    }, {});

    // Aktualizacja stanu gdy użytkownik wybierze coś w slocie
    const handleSlotUpdate = (slotKey, slotData) => {
        setRequestData((prev) => ({
            ...prev,
            [`${slotKey}Id`]: slotData.itemId,
            [`${slotKey}OrbId`]: slotData.orbId,
            [`${slotKey}OrbLevel`]: slotData.orbLevel,
            [`${slotKey}Drifs`]: slotData.drifIds,
            [`${slotKey}DrifLevels`]: slotData.drifLevels,
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
        <div className="w-full mx-auto p-6 flex flex-col md:flex-row gap-6">

            {/* Lewa kolumna - Ekwipunek */}
            <div className="flex-[2] bg-neutral-800 p-6 rounded-xl shadow-lg border border-neutral-700">
                <h1 className="text-3xl font-bold text-center text-orange-500 mb-6">
                    Broken Ranks Tool
                </h1>

                <div className="flex flex-wrap justify-center gap-6">
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

            {/* Prawa kolumna - Podzielona na 2 części */}
            <div className="flex-1 flex flex-col gap-6 sticky top-6 max-h-[calc(100vh-3rem)]">

                {/* 1. Moduł Bazy Przedmiotów */}
                <ItemDatabase groupedItems={itemsGroupedByCategory} />

                {/* 2. Moduł Kalkulatora Statystyk */}
                <StatsPanel stats={stats} onCalculate={calculateStats} />

            </div>
        </div>
    );
}

export default App;