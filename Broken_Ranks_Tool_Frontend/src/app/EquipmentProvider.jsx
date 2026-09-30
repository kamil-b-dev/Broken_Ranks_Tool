import { useState, useCallback, useEffect, useMemo } from "react";
import { parseBuildPayload } from "../features/builds/buildFile";
import { useEquipmentBuildTransfer } from "../features/builds/useEquipmentBuildTransfer";
import { useEquipmentLocks } from "../features/equipment/useEquipmentLocks";
import { useEquipmentCatalog } from "../features/equipment/useEquipmentCatalog";
import { useEquipmentStats } from "../features/equipment/useEquipmentStats";
import { useEquipmentOptimization } from "../features/optimizer/useEquipmentOptimization";
import { EquipmentContext } from "../shared/state/EquipmentContext";
import { readEquipmentDraft, writeEquipmentDraft } from "./storage/workingDraftStorage";

/**
 * Provides application state for equipment, character stats, and optimization.
 *
 * @param {object} props Provider properties.
 * @param {React.ReactNode} props.children Nested application components.
 * @returns {JSX.Element} The context provider.
 */
export const EquipmentProvider = ({ children }) => {
    const [initialDraft] = useState(readEquipmentDraft);
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
    const [draftRestored, setDraftRestored] = useState(!initialDraft);
    const {
        stats,
        statSources,
        isCalculatingStats,
        calculationNotice,
        dismissCalculationNotice,
        calculateStats,
        restoreStats,
    } = useEquipmentStats(requestData);

    const { lockedSlots, lockedDrifs, toggleSlotLock, toggleDrifLock, replaceLocks } =
        useEquipmentLocks();
    const {
        optimizationTrigger,
        markEquipmentChanged,
        applyOptimizationSetup,
        runDrifOptimization,
        cancelDrifOptimization,
    } = useEquipmentOptimization({
        requestData,
        setRequestData,
        restoreStats,
        lockedSlots,
        lockedDrifs,
    });
    const [characterConfig, setCharacterConfig] = useState(null);

    useEffect(() => {
        if (draftRestored || !initialDraft || loading || initialDataError) return;
        try {
            const imported = parseBuildPayload(
                {
                    format: "broken-ranks-tool-build",
                    version: 1,
                    build: initialDraft,
                },
                { ...data, gameRules }
            );
            setRequestData(imported.requestData);
            setCharacterConfig(imported.characterConfig);
            replaceLocks(imported.lockedSlots, imported.lockedDrifs);
            markEquipmentChanged();
        } catch {
            // Discard drafts that no longer satisfy the current catalogue and domain rules.
        } finally {
            setDraftRestored(true);
        }
    }, [
        data,
        draftRestored,
        gameRules,
        initialDataError,
        initialDraft,
        loading,
        markEquipmentChanged,
        replaceLocks,
    ]);

    useEffect(() => {
        if (!draftRestored) return;
        writeEquipmentDraft({
            requestData,
            characterConfig,
            lockedSlots,
            lockedDrifs,
        });
    }, [characterConfig, draftRestored, lockedDrifs, lockedSlots, requestData]);

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

    const { saveBuildToFile, loadBuildFromFile, createBuildSnapshot, loadBuildSnapshot } =
        useEquipmentBuildTransfer({
            data,
            requestData,
            characterConfig,
            lockedSlots,
            lockedDrifs,
            stats,
            statSources,
            setRequestData,
            setCharacterConfig,
            replaceLocks,
            restoreStats,
            markEquipmentChanged,
        });

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
            calculationNotice,
            dismissCalculationNotice,
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
            calculationNotice,
            dismissCalculationNotice,
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
