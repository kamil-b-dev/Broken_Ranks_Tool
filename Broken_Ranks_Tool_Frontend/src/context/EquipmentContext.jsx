import { createContext, useState, useEffect, useContext, useCallback } from "react";
import apiClient from "../api/axiosConfig";

const EquipmentContext = createContext();

/**
 * Niestandardowy hook zapewniający łatwy dostęp do kontekstu ekwipunku.
 * @returns {object} Obiekt kontekstu ekwipunku.
 */
export const useEquipment = () => useContext(EquipmentContext);

/**
 * Dostawca kontekstu, który zarządza całym stanem aplikacji.
 * Odpowiada za pobieranie danych początkowych, aktualizowanie slotów na sprzęt,
 * zarządzanie statystykami postaci i uruchamianie optymalizacji.
 *
 * @param {object} props - Właściwości komponentu.
 * @param {React.ReactNode} props.children - Komponenty potomne, które będą renderowane wewnątrz dostawcy.
 * @returns {JSX.Element} Komponent dostawcy.
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
    const [optimizationVariants, setOptimizationVariants] = useState([]);
    const [optimizationSuggestions, setOptimizationSuggestions] = useState([]);

    const [lockedSlots, setLockedSlots] = useState([]);
    const [lockedDrifs, setLockedDrifs] = useState({});

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
                console.error("Błąd podczas ładowania danych początkowych:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, []);

    /**
     * Funkcja zwrotna do aktualizacji danych konkretnego slota na sprzęt.
     * Opakowana w `useCallback`, aby zapobiec ponownemu tworzeniu przy każdym renderowaniu,
     * co pozwala uniknąć potencjalnych nieskończonych pętli w komponentach potomnych.
     * @param {string} slotKey - Klucz slota do aktualizacji.
     * @param {object} slotData - Nowe dane dla slota.
     */
    const handleSlotUpdate = useCallback((slotKey, slotData) => {
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
    }, []);

    /**
     * Funkcja zwrotna do aktualizacji bazowych statystyk postaci.
     * @param {object} newStats - Nowe statystyki postaci.
     */
    const handleCharacterStatsUpdate = useCallback((newStats) => {
        setRequestData((prev) => ({ ...prev, characterStats: newStats }));
    }, []);

    /**
     * Przełącza stan blokady slota na sprzęt na potrzeby optymalizacji.
     * @param {string} slotKey - Klucz slota do zablokowania lub odblokowania.
     */
    const toggleSlotLock = useCallback((slotKey) => {
        setLockedSlots(prev =>
            prev.includes(slotKey)
                ? prev.filter(key => key !== slotKey)
                : [...prev, slotKey]
        );
    }, []);

    /**
     * Przełącza stan blokady konkretnego drifa w slocie na sprzęt na potrzeby optymalizacji.
     * @param {string} slotKey - Klucz slota zawierającego drif.
     * @param {number} drifIndex - Indeks drifa do zablokowania lub odblokowania.
     */
    const toggleDrifLock = useCallback((slotKey, drifIndex) => {
        setLockedDrifs(prev => {
            const currentSlotLocks = prev[slotKey] || [];
            const isLocked = currentSlotLocks.includes(drifIndex);

            const updatedSlotLocks = isLocked
                ? currentSlotLocks.filter(idx => idx !== drifIndex)
                : [...currentSlotLocks, drifIndex];

            return {
                ...prev,
                [slotKey]: updatedSlotLocks
            };
        });
    }, []);

    /**
     * Wysyła aktualne dane ekwipunku i postaci do backendu w celu obliczenia ostatecznych statystyk.
     */
    const calculateStats = useCallback(async () => {
        try {
            const response = await apiClient.post("/calculator/calculate", requestData);
            setStats(response.data);
        } catch (error) {
            if (error.response && error.response.data && error.response.data.message) {
                alert(`BŁĄD ZAPISU: ${error.response.data.message}`);
            } else {
                alert("Błąd połączenia z serwerem obliczeniowym.");
            }
            console.error("Błąd podczas obliczania mocy:", error);
        }
    }, [requestData]);

    /**
     * Uruchamia proces optymalizacji drifów na podstawie priorytetów zdefiniowanych przez użytkownika i zablokowanych przedmiotów.
     * @param {object} optimizationConfig - Konfiguracja dla optymalizacji.
     * @param {object} optimizationConfig.priorities - Priorytety statystyk dla optymalizatora.
     * @param {object} optimizationConfig.targetQuantities - Docelowe ilości dla określonych statystyk.
     */
    const runDrifOptimization = useCallback(async (optimizationConfig) => {
        if (!requestData.slots || Object.values(requestData.slots).every(s => !s.itemId)) {
            alert("Wybierz przynajmniej jeden przedmiot, aby uruchomić optymalizację.");
            return;
        }

        const optimizationRequest = {
            originalSlots: requestData.slots,
            priorities: optimizationConfig.priorities || {},
            targetQuantities: optimizationConfig.targetQuantities || {},
            targetValues: optimizationConfig.targetValues || {},
            forceCapBonuses: optimizationConfig.forceCapBonuses || [],
            lockedSlots: lockedSlots,
            lockedDrifs: lockedDrifs
        };

        try {
            const response = await apiClient.post("/optimizer/drifs", optimizationRequest);
            const { optimizedSetup, summary, variants = [], suggestions = [] } = response.data;

            console.log("ODPOWIEDŹ Z BACKENDU:", response.data);

            if (summary.success && optimizedSetup && optimizedSetup.slots) {
                setOptimizationVariants(variants);
                setOptimizationSuggestions(suggestions);
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
            const backendMessage = error.response?.data?.summary?.message
                || error.response?.data?.message
                || error.response?.data?.error;
            const message = backendMessage
                || (error.code === "ECONNABORTED"
                    ? "Przekroczono limit czasu optymalizacji."
                    : error.message);
            alert(`Optymalizacja nie powiodła się: ${message}`);
            console.error("Błąd optymalizacji drifów:", error);
        }
    }, [requestData.slots, lockedSlots, lockedDrifs]);

    const applyOptimizationVariant = useCallback((setup) => {
        if (!setup?.slots) return;
        setRequestData(prev => ({ ...prev, slots: setup.slots }));
        setOptimizationTrigger(prev => prev + 1);
    }, []);

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
        optimizationVariants,
        optimizationSuggestions,
        lockedSlots,
        lockedDrifs,
        handleSlotUpdate,
        handleCharacterStatsUpdate,
        toggleSlotLock,
        toggleDrifLock,
        calculateStats,
        runDrifOptimization,
        applyOptimizationVariant
    };

    return (
        <EquipmentContext.Provider value={value}>
            {children}
        </EquipmentContext.Provider>
    );
};
