import { createContext, useState, useEffect, useContext } from "react";
import apiClient from "../api/axiosConfig";

const EquipmentContext = createContext();

export const useEquipment = () => useContext(EquipmentContext);

export const EquipmentProvider = ({ children }) => {
    const [data, setData] = useState({ items: [], orbs: [], drifs: [] });
    const [categoryNames, setCategoryNames] = useState({});
    const [orbCategories, setOrbCategories] = useState({});
    const [drifCategories, setDrifCategories] = useState({});
    const [gameRules, setGameRules] = useState(null);

    const [requestData, setRequestData] = useState({ slots: {}, characterStats: {} });
    const [stats, setStats] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [itemsRes, orbsRes, drifsRes, rulesRes, orbCatRes, drifCatRes] = await Promise.all([
                    apiClient.get("/items"),
                    apiClient.get("/orbs"),
                    apiClient.get("/drifs"),
                    apiClient.get("/rules"),
                    apiClient.get("/dictionaries/orb-categories"),
                    apiClient.get("/dictionaries/drif-categories")
                ]);
                setData({ items: itemsRes.data, orbs: orbsRes.data, drifs: drifsRes.data });
                setGameRules(rulesRes.data);
                setOrbCategories(orbCatRes.data);
                setDrifCategories(drifCatRes.data);
            } catch (error) {
                console.error("Błąd ładowania danych mroku:", error);
            }

            try {
                const catRes = await apiClient.get("/dictionaries/categories");
                setCategoryNames(catRes.data);
            } catch (error) {
                console.warn("Błąd ładowania słowników:", error);
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
                    orbIds: slotData.orbIds,
                    orbLevels: slotData.orbLevels,
                    drifIds: slotData.drifIds,
                    drifLevels: slotData.drifLevels,
                }
            }
        }));
    };

    const handleCharacterStatsUpdate = (newStats) => {
        setRequestData((prev) => ({ ...prev, characterStats: newStats }));
    };

    const calculateStats = async () => {
        try {
            const response = await apiClient.post("/calculator/calculate", requestData);
            setStats(response.data);
        } catch (error) {
            if (error.response && error.response.data && error.response.data.message) {
                alert(`BŁĄD ZAPISU: ${error.response.data.message}`);
            } else {
                alert("Błąd połączenia z serwerem obliczeniowym.");
            }
            console.error("Błąd kalkulacji potęgi:", error);
        }
    };

    const value = {
        data,
        categoryNames,
        orbCategories,
        drifCategories,
        gameRules,
        requestData,
        stats,
        handleSlotUpdate,
        handleCharacterStatsUpdate,
        calculateStats
    };

    return (
        <EquipmentContext.Provider value={value}>
            {children}
        </EquipmentContext.Provider>
    );
};
