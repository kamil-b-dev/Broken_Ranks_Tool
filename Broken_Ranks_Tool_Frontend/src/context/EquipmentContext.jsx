import { createContext, useState, useContext, useCallback, useMemo } from "react";
import { createBuildPayload, downloadBuildPayload, parseBuildFile } from "../utils/buildFile";
import { useEquipmentLocks } from "../hooks/useEquipmentLocks";
import { useEquipmentCatalog } from "../hooks/useEquipmentCatalog";
import { useEquipmentStats } from "../hooks/useEquipmentStats";
import { useEquipmentOptimization } from "../hooks/useEquipmentOptimization";

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
    const {
        data,
        categoryNames,
        orbCategories,
        drifCategories,
        gameRules,
        loading,
        initialDataError,
    } = useEquipmentCatalog();

    const [requestData, setRequestData] = useState({ slots: {}, characterStats: {} });
    const { stats, statSources, isCalculatingStats, calculateStats, resetStats } =
        useEquipmentStats(requestData);

    const { lockedSlots, lockedDrifs, toggleSlotLock, toggleDrifLock, replaceLocks } =
        useEquipmentLocks();
    const {
        optimizationTrigger,
        markEquipmentChanged,
        applyOptimizationSetup,
        runDrifOptimization,
    } = useEquipmentOptimization({
        slots: requestData.slots,
        setRequestData,
        lockedSlots,
        lockedDrifs,
    });
    const [characterConfig, setCharacterConfig] = useState(null);

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
                },
            },
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
        const payload = createBuildPayload({
            requestData,
            characterConfig,
            lockedSlots,
            lockedDrifs,
        });
        downloadBuildPayload(payload);
    }, [requestData, characterConfig, lockedSlots, lockedDrifs]);

    /**
     * Loads and validates a build created by the application.
     * @param {File} file JSON build file selected by the user.
     * @throws {Error} If the file is missing, invalid, unsupported, or references unknown data.
     */
    const loadBuildFromFile = useCallback(
        async (file) => {
            const importedBuild = await parseBuildFile(file, data);
            setRequestData(importedBuild.requestData);
            setCharacterConfig(importedBuild.characterConfig);
            replaceLocks(importedBuild.lockedSlots, importedBuild.lockedDrifs);
            resetStats();
            markEquipmentChanged();
        },
        [data, markEquipmentChanged, replaceLocks, resetStats]
    );

    const value = useMemo(
        () => ({
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
            loadBuildFromFile,
        }),
        [
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
            loadBuildFromFile,
        ]
    );

    return <EquipmentContext.Provider value={value}>{children}</EquipmentContext.Provider>;
};
