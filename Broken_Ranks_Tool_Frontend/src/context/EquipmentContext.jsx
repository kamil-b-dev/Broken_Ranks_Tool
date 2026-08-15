import { createContext, useState, useEffect, useContext, useCallback } from "react";
import apiClient from "../api/axiosConfig";

const EquipmentContext = createContext();
const BUILD_FILE_FORMAT = "broken-ranks-tool-build";
const BUILD_FILE_VERSION = 1;

/**
 * Niestandardowy hook zapewniający łatwy dostęp do kontekstu ekwipunku.
 * @returns {object} Obiekt kontekstu ekwipunku.
 */
// Provider and hook intentionally live together because the context is private to this module.
// eslint-disable-next-line react-refresh/only-export-components
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
    const [initialDataError, setInitialDataError] = useState(null);

    const [requestData, setRequestData] = useState({ slots: {}, characterStats: {} });
    const [stats, setStats] = useState(null);

    const [optimizationTrigger, setOptimizationTrigger] = useState(0);

    const [lockedSlots, setLockedSlots] = useState([]);
    const [lockedDrifs, setLockedDrifs] = useState({});
    const [characterConfig, setCharacterConfig] = useState(null);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                setLoading(true);
                setInitialDataError(null);
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
                setInitialDataError(error.response?.data?.message || "Nie udało się połączyć z backendem.");
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
    const handleCharacterStatsUpdate = useCallback((newStats, newConfig = null) => {
        setRequestData((prev) => ({ ...prev, characterStats: newStats }));
        if (newConfig) setCharacterConfig(newConfig);
    }, []);

    /** Pobiera kompletny build jako wersjonowany plik JSON. */
    const saveBuildToFile = useCallback(() => {
        const payload = {
            format: BUILD_FILE_FORMAT,
            version: BUILD_FILE_VERSION,
            exportedAt: new Date().toISOString(),
            build: {
                requestData,
                characterConfig,
                lockedSlots,
                lockedDrifs
            }
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `broken-ranks-build-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        // Zwolnienie URL w następnym cyklu daje przeglądarce czas na
        // rozpoczęcie pobierania pliku (część silników anuluje je natychmiast).
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, [requestData, characterConfig, lockedSlots, lockedDrifs]);

    /** Wczytuje i waliduje build utworzony przez aplikację. */
    const loadBuildFromFile = useCallback(async (file) => {
        if (!file) throw new Error("Nie wybrano pliku buildu.");
        if (file.size > 5 * 1024 * 1024) throw new Error("Plik buildu jest zbyt duży.");

        let payload;
        try {
            payload = JSON.parse(await file.text());
        } catch {
            throw new Error("Plik nie zawiera poprawnego JSON-a.");
        }
        if (payload?.format !== BUILD_FILE_FORMAT || payload?.version !== BUILD_FILE_VERSION) {
            throw new Error("Nieobsługiwany format lub wersja pliku buildu.");
        }

        const build = payload.build;
        const importedRequest = build?.requestData;
        if (!importedRequest || typeof importedRequest !== "object"
                || !importedRequest.slots || typeof importedRequest.slots !== "object"
                || Array.isArray(importedRequest.slots)) {
            throw new Error("Plik nie zawiera poprawnej konfiguracji slotów.");
        }

        const knownItems = new Set(data.items.map(item => String(item.id)));
        const knownOrbs = new Set(data.orbs.map(orb => String(orb.id)));
        const knownDrifs = new Set(data.drifs.map(drif => String(drif.id)));
        Object.entries(importedRequest.slots).forEach(([slotKey, slot]) => {
            if (!slot || typeof slot !== "object") throw new Error(`Niepoprawne dane slota ${slotKey}.`);
            if (slot.itemId != null && !knownItems.has(String(slot.itemId))) {
                throw new Error(`Build odwołuje się do nieznanego przedmiotu w slocie ${slotKey}.`);
            }
            (slot.orbIds || []).filter(Boolean).forEach(id => {
                if (!knownOrbs.has(String(id))) throw new Error(`Build zawiera nieznany orb w slocie ${slotKey}.`);
            });
            (slot.drifIds || []).filter(Boolean).forEach(id => {
                if (!knownDrifs.has(String(id))) throw new Error(`Build zawiera nieznany drif w slocie ${slotKey}.`);
            });
        });

        const clonedRequest = JSON.parse(JSON.stringify({
            slots: importedRequest.slots,
            characterStats: importedRequest.characterStats || {}
        }));
        setRequestData(clonedRequest);
        setCharacterConfig(build.characterConfig || null);
        setLockedSlots(Array.isArray(build.lockedSlots) ? [...build.lockedSlots] : []);
        setLockedDrifs(build.lockedDrifs && typeof build.lockedDrifs === "object"
            ? JSON.parse(JSON.stringify(build.lockedDrifs)) : {});
        setStats(null);
        setOptimizationTrigger(prev => prev + 1);
    }, [data.items, data.orbs, data.drifs]);

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
            criticalBonuses: optimizationConfig.criticalBonuses || [],
            lockedSlots: lockedSlots,
            lockedDrifs: lockedDrifs
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

    const value = {
        data,
        categoryNames,
        orbCategories,
        drifCategories,
        gameRules,
        loading,
        initialDataError,
        requestData,
        stats,
        optimizationTrigger,
        lockedSlots,
        lockedDrifs,
        characterConfig,
        handleSlotUpdate,
        handleCharacterStatsUpdate,
        toggleSlotLock,
        toggleDrifLock,
        calculateStats,
        runDrifOptimization,
        saveBuildToFile,
        loadBuildFromFile
    };

    return (
        <EquipmentContext.Provider value={value}>
            {children}
        </EquipmentContext.Provider>
    );
};
