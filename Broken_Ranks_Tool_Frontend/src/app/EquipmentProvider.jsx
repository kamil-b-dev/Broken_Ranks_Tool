import { useState, useCallback, useEffect, useMemo } from "react";
import { useEquipmentBuildTransfer } from "../features/builds/useEquipmentBuildTransfer";
import { useEquipmentLocks } from "../features/equipment/useEquipmentLocks";
import { useEquipmentCatalog } from "../features/equipment/useEquipmentCatalog";
import { useEquipmentStats } from "../features/equipment/useEquipmentStats";
import { useEquipmentOptimization } from "../features/optimizer/useEquipmentOptimization";
import {
    EquipmentContext,
    EquipmentCatalogContext,
    EquipmentSetupContext,
    EquipmentLocksContext,
    EquipmentCalculationContext,
    EquipmentBuildActionsContext,
} from "../shared/state/EquipmentContext";
import {
    readEquipmentDraft,
    writeEquipmentDraft,
    preserveEquipmentDraft,
} from "./storage/workingDraftStorage";
import { equipmentRequestIdentity } from "../shared/domain/equipment/equipmentRequestIdentity";
import { useWorkingDraftSave } from "./storage/useWorkingDraftSave";

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
    } = useEquipmentCatalog({ deferHome: true });

    const [requestData, setRequestData] = useState({ slots: {}, characterStats: {} });
    const [draftRestored, setDraftRestored] = useState(!initialDraft);
    const [draftWritesAllowed, setDraftWritesAllowed] = useState(true);
    const {
        stats,
        statSources,
        isCalculatingStats,
        calculationNotice,
        dismissCalculationNotice,
        calculateStats,
        calculateStatsFor,
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
        invalidateDrifOptimization,
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
        let active = true;
        const restore = async () => {
            try {
                const { parseBuildPayload } = await import("../features/builds/buildFile");
                if (!active) return;
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
                if (!active) return;
                // Keep a recoverable copy; never overwrite the original if that copy cannot be saved.
                setDraftWritesAllowed(preserveEquipmentDraft());
            } finally {
                if (active) setDraftRestored(true);
            }
        };
        void restore();
        return () => {
            active = false;
        };
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

    const workingDraft = useMemo(
        () => ({ requestData, characterConfig, lockedSlots, lockedDrifs }),
        [requestData, characterConfig, lockedSlots, lockedDrifs]
    );
    useWorkingDraftSave(writeEquipmentDraft, workingDraft, draftRestored && draftWritesAllowed);

    /**
     * Updates the equipment data for a single slot.
     * @param {string} slotKey Equipment slot identifier.
     * @param {object} slotData New slot data.
     */
    const handleSlotUpdate = useCallback((slotKey, slotData) => {
        setRequestData((prev) => {
            if (
                equipmentRequestIdentity({ slots: { [slotKey]: prev.slots?.[slotKey] } }) ===
                equipmentRequestIdentity({ slots: { [slotKey]: slotData } })
            )
                return prev;
            return {
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
            };
        });
    }, []);

    /**
     * Updates the character's base statistics.
     * @param {object} newStats New character statistics.
     */
    const handleCharacterStatsUpdate = useCallback((newStats, newConfig = null) => {
        setRequestData((prev) =>
            equipmentRequestIdentity({ characterStats: prev.characterStats }) ===
            equipmentRequestIdentity({ characterStats: newStats })
                ? prev
                : { ...prev, characterStats: newStats }
        );
        if (newConfig)
            setCharacterConfig((previous) =>
                JSON.stringify(previous) === JSON.stringify(newConfig) ? previous : newConfig
            );
    }, []);

    const buildImportData = useMemo(() => ({ ...data, gameRules }), [data, gameRules]);
    const { loadBuildFromFile, createBuildSnapshot, loadBuildSnapshot } = useEquipmentBuildTransfer(
        {
            data: buildImportData,
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
            calculateStatsFor,
            markEquipmentChanged,
        }
    );

    const value = useMemo(
        () => ({
            data,
            categoryNames,
            orbCategories,
            drifCategories,
            gameRules,
            loading: loading || !draftRestored,
            initialDataError,
            draftRestored,
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
            invalidateDrifOptimization,
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
            draftRestored,
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
            invalidateDrifOptimization,
            loadBuildFromFile,
            createBuildSnapshot,
            loadBuildSnapshot,
        ]
    );

    const catalogValue = useMemo(
        () => ({
            data,
            categoryNames,
            orbCategories,
            drifCategories,
            gameRules,
            loading: loading || !draftRestored,
            initialDataError,
        }),
        [
            data,
            categoryNames,
            orbCategories,
            drifCategories,
            gameRules,
            loading,
            initialDataError,
            draftRestored,
        ]
    );
    const setupValue = useMemo(
        () => ({
            requestData,
            characterConfig,
            optimizationTrigger,
            handleSlotUpdate,
            handleCharacterStatsUpdate,
        }),
        [
            requestData,
            characterConfig,
            optimizationTrigger,
            handleSlotUpdate,
            handleCharacterStatsUpdate,
        ]
    );
    const locksValue = useMemo(
        () => ({ lockedSlots, lockedDrifs, toggleSlotLock, toggleDrifLock }),
        [lockedSlots, lockedDrifs, toggleSlotLock, toggleDrifLock]
    );
    const calculationValue = useMemo(
        () => ({
            stats,
            statSources,
            isCalculatingStats,
            calculationNotice,
            dismissCalculationNotice,
            calculateStats,
        }),
        [
            stats,
            statSources,
            isCalculatingStats,
            calculationNotice,
            dismissCalculationNotice,
            calculateStats,
        ]
    );

    const buildActionsValue = useMemo(
        () => ({ createBuildSnapshot, loadBuildSnapshot, loadBuildFromFile }),
        [createBuildSnapshot, loadBuildSnapshot, loadBuildFromFile]
    );
    return (
        <EquipmentBuildActionsContext.Provider value={buildActionsValue}>
            <EquipmentCatalogContext.Provider value={catalogValue}>
                <EquipmentSetupContext.Provider value={setupValue}>
                    <EquipmentLocksContext.Provider value={locksValue}>
                        <EquipmentCalculationContext.Provider value={calculationValue}>
                            <EquipmentContext.Provider value={value}>
                                {children}
                            </EquipmentContext.Provider>
                        </EquipmentCalculationContext.Provider>
                    </EquipmentLocksContext.Provider>
                </EquipmentSetupContext.Provider>
            </EquipmentCatalogContext.Provider>
        </EquipmentBuildActionsContext.Provider>
    );
};
