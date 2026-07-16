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
    const [loading, setLoading] = useState(true);

    const [requestData, setRequestData] = useState({ slots: {}, characterStats: {} });
    const [stats, setStats] = useState(null);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                setLoading(true);
                const response = await apiClient.get("/initial-data");
                const initialData = response.data;

                setData({
                    items: initialData.items || [],
                    orbs: initialData.orbs || [],
                    drifs: initialData.drifs || []
                });
                setGameRules(initialData.gameRules || {});
                setCategoryNames(initialData.dictionaries?.itemCategories || {});
                setOrbCategories(initialData.dictionaries?.orbCategories || {});
                setDrifCategories(initialData.dictionaries?.drifCategories || {});

            } catch (error) {
                console.error("Błąd ładowania danych startowych:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
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
        loading,
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
