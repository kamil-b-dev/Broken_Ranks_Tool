import { createContext, useState, useEffect, useContext } from "react";
import apiClient from "../api/axiosConfig";

const EquipmentContext = createContext();

/**
 * Hook do łatwego dostępu do kontekstu ekwipunku.
 * @returns {object} Obiekt kontekstu.
 */
export const useEquipment = () => useContext(EquipmentContext);

/**
 * Dostawca kontekstu, który zarządza całym stanem aplikacji związanym z ekwipunkiem,
 * danymi z gry oraz komunikacją z backendem.
 * @param {object} props
 * @param {React.ReactNode} props.children Komponenty potomne, które będą miały dostęp do kontekstu.
 * @returns {JSX.Element}
 */
export const EquipmentProvider = ({ children }) => {
    const [data, setData] = useState({ items: [], orbs: [], drifs: [] });
    const [categoryNames, setCategoryNames] = useState({});
    const [orbCategories, setOrbCategories] = useState({});
    const [drifCategories, setDrifCategories] = useState({});
    const [gameRules, setGameRules] = useState(null);
    const [loading, setLoading] = useState(true);

    const [requestData, setRequestData] = useState({ slots: {}, characterStats: {} });
    const [stats, setStats] = useState(null);

    const [optimizationTrigger, setOptimizationTrigger] = useState(0);

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

    /**
     * Aktualizuje dane dla pojedynczego slotu ekwipunku.
     * @param {string} slotKey Klucz identyfikujący slot (np. "helmet").
     * @param {object} slotData Nowe dane dla slotu.
     */
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

    /**
     * Aktualizuje statystyki bazowe postaci.
     * @param {object} newStats Nowe statystyki postaci.
     */
    const handleCharacterStatsUpdate = (newStats) => {
        setRequestData((prev) => ({ ...prev, characterStats: newStats }));
    };

    /**
     * Wysyła aktualną konfigurację ekwipunku do backendu w celu obliczenia statystyk.
     */
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

    /**
     * Uruchamia proces optymalizacji drifów na backendzie.
     * @param {Array<string>} prioritizedBonuses Posortowana lista kluczy bonusów do priorytetyzacji.
     */
    const runDrifOptimization = async (prioritizedBonuses) => {
        if (!requestData.slots || Object.values(requestData.slots).every(s => !s.itemId)) {
            alert("Wybierz przynajmniej jeden przedmiot, aby uruchomić optymalizację.");
            return;
        }

        const optimizationRequest = {
            originalSlots: requestData.slots,
            prioritizedBonuses,
        };

        try {
            const response = await apiClient.post("/optimizer/drifs", optimizationRequest);
            const { optimizedSetup, summary } = response.data;

            console.log("ODPOWIEDŹ Z BACKENDU:", response.data);

            if (summary.success && optimizedSetup && optimizedSetup.slots) {
                setRequestData(prev => ({
                    ...prev,
                    slots: optimizedSetup.slots
                }));
                setOptimizationTrigger(prev => prev + 1);
                alert(`Optymalizacja zakończona! Umieszczono ${summary.drifsPlaced} drifów.`);
            } else {
                alert(`Optymalizacja nie powiodła się: ${summary.message}`);
            }
        } catch (error) {
            alert("Wystąpił krytyczny błąd podczas optymalizacji.");
            console.error("Błąd optymalizacji drifów:", error);
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
        optimizationTrigger,
        handleSlotUpdate,
        handleCharacterStatsUpdate,
        calculateStats,
        runDrifOptimization
    };

    return (
        <EquipmentContext.Provider value={value}>
            {children}
        </EquipmentContext.Provider>
    );
};
