import { createContext, useState, useEffect, useContext, useCallback, useMemo } from "react";
import apiClient from "../api/axiosConfig";
import {
    createBuildPayload,
    parseBuildFile
} from "../utils/buildFile";

const EquipmentContext = createContext();

/**
 * Provides access to the equipment context.
 * @returns {object} Shared equipment state, actions, and derived values.
 */
// Provider and hook intentionally live together because the context is private to this module.
// eslint-disable-next-line react-refresh/only-export-components
export const useEquipment = () => {
    const context = useContext(EquipmentContext);
    if (!context) throw new Error("useEquipment musi być użyty wewnątrz EquipmentProvider.");
    return context;
};

/**
 * Provides application state for equipment, character stats, and optimization.
 *
 * @param {object} props Provider properties.
 * @param {React.ReactNode} props.children Nested application components.
 * @returns {JSX.Element} The context provider.
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
    const [statSources, setStatSources] = useState({ drifCategories: {}, orbBonusTypes: [] });
    const [isCalculatingStats, setIsCalculatingStats] = useState(false);

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
 * Updates the equipment data for a single slot.
 * @param {string} slotKey Equipment slot identifier.
 * @param {object} slotData New slot data.
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
 * Updates the character's base statistics.
 * @param {object} newStats New character statistics.
 */
    const handleCharacterStatsUpdate = useCallback((newStats, newConfig = null) => {
        setRequestData((prev) => ({ ...prev, characterStats: newStats }));
        if (newConfig) setCharacterConfig(newConfig);
    }, []);

/** Exports the complete build as a versioned JSON file for later import. */
    const saveBuildToFile = useCallback(() => {
        const payload = createBuildPayload({ requestData, characterConfig, lockedSlots, lockedDrifs });
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

/**
 * Loads and validates a build created by the application.
 * @param {File} file JSON build file selected by the user.
 * @throws {Error} If the file is missing, invalid, unsupported, or references unknown data.
 */
    const loadBuildFromFile = useCallback(async (file) => {
        const importedBuild = await parseBuildFile(file, data);
        setRequestData(importedBuild.requestData);
        setCharacterConfig(importedBuild.characterConfig);
        setLockedSlots(importedBuild.lockedSlots);
        setLockedDrifs(importedBuild.lockedDrifs);
        setStats(null);
        setStatSources({ drifCategories: {}, orbBonusTypes: [] });
        setOptimizationTrigger(prev => prev + 1);
    }, [data]);

/**
 * Toggles an equipment slot lock used by the optimizer.
 * @param {string} slotKey Equipment slot identifier.
 */
    const toggleSlotLock = useCallback((slotKey) => {
        setLockedSlots(prev =>
            prev.includes(slotKey)
                ? prev.filter(key => key !== slotKey)
                : [...prev, slotKey]
        );
    }, []);

/**
 * Toggles a drif lock within an equipment slot.
 * @param {string} slotKey Equipment slot identifier.
 * @param {number} drifIndex Drif position within the slot.
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
 * Sends the current equipment and character data to calculate final statistics.
 * Updates the shared statistics state or reports the backend error to the user.
 */
    const calculateStats = useCallback(async () => {
        setIsCalculatingStats(true);
        try {
            const response = await apiClient.post("/calculator/calculate", requestData);
            setStats(response.data.stats || response.data);
            setStatSources({
                drifCategories: response.data.drifCategories || {},
                orbBonusTypes: response.data.orbBonusTypes || []
            });
        } catch (error) {
            if (error.response && error.response.data && error.response.data.message) {
                alert(`BŁĄD ZAPISU: ${error.response.data.message}`);
            } else {
                alert("Błąd połączenia z serwerem obliczeniowym.");
            }
            console.error("Błąd podczas obliczania mocy:", error);
        } finally {
            setIsCalculatingStats(false);
        }
    }, [requestData]);

    /** Applies a calculator-ready equipment setup selected from optimizer variants. */
    const applyOptimizationSetup = useCallback((setup) => {
        if (!setup?.slots) return false;
        setRequestData(prev => ({
            ...prev,
            slots: setup.slots
        }));
        setOptimizationTrigger(prev => prev + 1);
        return true;
    }, []);

/**
 * Starts drif optimization using user priorities and locked equipment.
 * @param {object} optimizationConfig User priorities and quantity targets.
 */
    const runDrifOptimization = useCallback(async (optimizationConfig) => {
        if (!requestData.slots || Object.values(requestData.slots).every(s => !s.itemId)) {
            return {
                success: false,
                message: "Wybierz przynajmniej jeden przedmiot, aby uruchomić optymalizację.",
                applied: false
            };
        }

        const optimizationRequest = {
            originalSlots: requestData.slots,
            priorities: optimizationConfig.priorities || {},
            targetQuantities: optimizationConfig.targetQuantities || {},
            forceCapBonuses: optimizationConfig.forceCapBonuses || [],
            forcedPercentageTargets: optimizationConfig.forcedPercentageTargets || {},
            maximizeBonuses: optimizationConfig.maximizeBonuses || [],
            forceMaximizationByDrifBonus:
                Boolean(optimizationConfig.forceMaximizationByDrifBonus),
            generateVariants: Boolean(optimizationConfig.generateVariants),
            maxVariantLossPercent: Number(optimizationConfig.maxVariantLossPercent),
            lockedSlots: lockedSlots,
            lockedDrifs: lockedDrifs
        };

        try {
            const response = await apiClient.post("/optimizer/drifs", optimizationRequest);
            const { optimizedSetup, summary } = response.data;

            if (applyOptimizationSetup(optimizedSetup)) {
                return { ...summary, applied: true };
            } else {
                return { ...summary, applied: false };
            }
        } catch (error) {
            const backendMessage = error.response?.data?.summary?.message
                || error.response?.data?.message
                || error.response?.data?.error;
            const message = backendMessage
                || (error.code === "ECONNABORTED"
                    ? "Przekroczono limit czasu optymalizacji."
                    : error.message);
            console.error("Błąd optymalizacji drifów:", error);
            return { success: false, message, applied: false };
        }
    }, [requestData.slots, lockedSlots, lockedDrifs, applyOptimizationSetup]);

    const value = useMemo(() => ({
        data,
        categoryNames,
        orbCategories,
        drifCategories,
        gameRules,
        loading,
        initialDataError,
        requestData,
        stats,
        statSources,
        isCalculatingStats,
        optimizationTrigger,
        lockedSlots,
        lockedDrifs,
        characterConfig,
        handleSlotUpdate,
        handleCharacterStatsUpdate,
        toggleSlotLock,
        toggleDrifLock,
        calculateStats,
        applyOptimizationSetup,
        runDrifOptimization,
        saveBuildToFile,
        loadBuildFromFile
    }), [
        data, categoryNames, orbCategories, drifCategories, gameRules, loading, initialDataError,
        requestData, stats, statSources, isCalculatingStats, optimizationTrigger, lockedSlots,
        lockedDrifs, characterConfig, handleSlotUpdate, handleCharacterStatsUpdate, toggleSlotLock,
        toggleDrifLock, calculateStats, applyOptimizationSetup, runDrifOptimization,
        saveBuildToFile, loadBuildFromFile
    ]);

    return (
        <EquipmentContext.Provider value={value}>
            {children}
        </EquipmentContext.Provider>
    );
};
