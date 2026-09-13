import { useState, useCallback, useMemo } from "react";
import {
    createBuildPayload,
    downloadBuildPayload,
    parseBuildFile,
    parseBuildPayload,
} from "../features/builds/buildFile";
import { useEquipmentLocks } from "../features/equipment/useEquipmentLocks";
import { useEquipmentCatalog } from "../features/equipment/useEquipmentCatalog";
import { useEquipmentStats } from "../features/equipment/useEquipmentStats";
import { useEquipmentOptimization } from "../features/optimizer/useEquipmentOptimization";
import { EquipmentContext } from "../shared/state/EquipmentContext";

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
    const { stats, statSources, isCalculatingStats, calculateStats, restoreStats } =
        useEquipmentStats(requestData);

    const { lockedSlots, lockedDrifs, toggleSlotLock, toggleDrifLock, replaceLocks } =
        useEquipmentLocks();
    const {
        optimizationTrigger,
        markEquipmentChanged,
        applyOptimizationSetup,
        runDrifOptimization,
        cancelDrifOptimization,
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

    /** Captures the current editor state for file export or the local build library. */
    const createBuildSnapshot = useCallback(
        () => ({
            payload: createBuildPayload({
                requestData,
                characterConfig,
                lockedSlots,
                lockedDrifs,
            }),
            stats,
            statSources,
        }),
        [requestData, characterConfig, lockedSlots, lockedDrifs, stats, statSources]
    );

    const applyImportedBuild = useCallback(
        (importedBuild, savedStats = null, savedStatSources = {}) => {
            setRequestData(importedBuild.requestData);
            setCharacterConfig(importedBuild.characterConfig);
            replaceLocks(importedBuild.lockedSlots, importedBuild.lockedDrifs);
            restoreStats(savedStats, savedStatSources, importedBuild.requestData);
            markEquipmentChanged();
        },
        [markEquipmentChanged, replaceLocks, restoreStats]
    );

    /** Exports the complete build as a versioned JSON file for later import. */
    const saveBuildToFile = useCallback(() => {
        const { payload } = createBuildSnapshot();
        downloadBuildPayload(payload);
    }, [createBuildSnapshot]);

    /** Loads and validates a snapshot saved in the browser library. */
    const loadBuildSnapshot = useCallback(
        (snapshot) => {
            const importedBuild = parseBuildPayload(snapshot?.payload, data);
            applyImportedBuild(importedBuild, snapshot?.stats, snapshot?.statSources);
        },
        [applyImportedBuild, data]
    );

    /**
     * Loads and validates a build created by the application.
     * @param {File} file JSON build file selected by the user.
     * @throws {Error} If the file is missing, invalid, unsupported, or references unknown data.
     */
    const loadBuildFromFile = useCallback(
        async (file) => {
            const importedBuild = await parseBuildFile(file, data);
            applyImportedBuild(importedBuild);
            return importedBuild.importSummary || null;
        },
        [applyImportedBuild, data]
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
            cancelDrifOptimization,
            saveBuildToFile,
            loadBuildFromFile,
            createBuildSnapshot,
            loadBuildSnapshot,
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
            cancelDrifOptimization,
            saveBuildToFile,
            loadBuildFromFile,
            createBuildSnapshot,
            loadBuildSnapshot,
        ]
    );

    return <EquipmentContext.Provider value={value}>{children}</EquipmentContext.Provider>;
};
