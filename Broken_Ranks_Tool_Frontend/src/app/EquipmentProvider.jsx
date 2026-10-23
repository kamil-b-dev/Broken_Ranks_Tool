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
    EquipmentBackpackContext,
    EquipmentHistoryContext,
    EquipmentStorageContext,
} from "../shared/state/EquipmentContext";
import {
    readEquipmentDraftState,
    writeEquipmentDraft,
    preserveEquipmentDraft,
    readEquipmentDraftRaw,
} from "./storage/workingDraftStorage";
import { equipmentRequestIdentity } from "../shared/domain/equipment/equipmentRequestIdentity";
import { useWorkingDraftSave } from "./storage/useWorkingDraftSave";
import { useBackpackEquipmentTransfer } from "../features/builder/backpack/useBackpackEquipmentTransfer";
import { normalizeBackpack } from "../features/builder/backpack/backpackSerialization";
import { useEquipmentHistory } from "../features/equipment/useEquipmentHistory";

/**
 * Provides application state for equipment, character stats, and optimization.
 *
 * @param {object} props Provider properties.
 * @param {React.ReactNode} props.children Nested application components.
 * @returns {JSX.Element} The context provider.
 */
export const EquipmentProvider = ({ children }) => {
    const [initialStorage] = useState(readEquipmentDraftState);
    const initialDraft = initialStorage.draft;
    const [recoveryRaw] = useState(() => readEquipmentDraftRaw(initialStorage.sourceKey));
    const [draftRejected, setDraftRejected] = useState(Boolean(initialStorage.rejected));
    const [backpack, setBackpack] = useState([]);
    const [backpackImportRevision, setBackpackImportRevision] = useState(0);
    const handleBackpackChange = useCallback(
        (entries) => setBackpack(normalizeBackpack(entries)),
        []
    );
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
    const [draftWritesAllowed, setDraftWritesAllowed] = useState(
        () =>
            !initialStorage.rejected || preserveEquipmentDraft(undefined, initialStorage.sourceKey)
    );
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
        canUndoReorganization,
        reorganizationUndoWarning,
        undoReorganization,
        clearReorganizationUndo,
    } = useEquipmentOptimization({
        requestData,
        setRequestData,
        restoreStats,
        lockedSlots,
        lockedDrifs,
        backpack,
        setBackpack,
        data,
        gameRules,
    });
    const [characterConfig, setCharacterConfig] = useState(null);
    const changeBackpackDrifLocks = useCallback(
        (next) => replaceLocks(lockedSlots, next),
        [replaceLocks, lockedSlots]
    );
    const backpackTransfer = useBackpackEquipmentTransfer({
        backpack,
        requestData,
        data,
        gameRules: gameRules || {},
        setBackpack,
        setRequestData,
        markEquipmentChanged,
        lockedDrifs,
        onDrifLocksChange: changeBackpackDrifLocks,
    });
    const clearRemovalHistory = backpackTransfer.clearRemovalHistory;
    const handleBackpackImport = useCallback(() => {
        clearRemovalHistory();
        setBackpackImportRevision((revision) => revision + 1);
    }, [clearRemovalHistory]);

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
                        version: initialStorage.buildVersion,
                        build: initialDraft,
                    },
                    { ...data, gameRules }
                );
                setRequestData(imported.requestData);
                setBackpack(imported.backpack || []);
                setCharacterConfig(imported.characterConfig);
                replaceLocks(imported.lockedSlots, imported.lockedDrifs);
                markEquipmentChanged();
            } catch {
                if (!active) return;
                setDraftRejected(true);
                // Keep a recoverable copy; never overwrite the original if that copy cannot be saved.
                setDraftWritesAllowed(preserveEquipmentDraft(undefined, initialStorage.sourceKey));
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
        initialStorage,
        loading,
        markEquipmentChanged,
        replaceLocks,
    ]);

    const workingDraft = useMemo(
        () => ({ requestData, characterConfig, lockedSlots, lockedDrifs, backpack }),
        [requestData, characterConfig, lockedSlots, lockedDrifs, backpack]
    );
    const { saveFailed, retrySave } = useWorkingDraftSave(
        writeEquipmentDraft,
        workingDraft,
        draftRestored && draftWritesAllowed
    );
    const retryDraftSave = useCallback(() => {
        if (!draftWritesAllowed) {
            setDraftWritesAllowed(preserveEquipmentDraft(undefined, initialStorage.sourceKey));
        } else retrySave();
    }, [draftWritesAllowed, retrySave, initialStorage.sourceKey]);
    const storageValue = useMemo(
        () => ({
            saveFailed: saveFailed || !draftWritesAllowed,
            retrySave: retryDraftSave,
            draftRejected,
            recoveryRaw,
            dismissRecovery: () => setDraftRejected(false),
        }),
        [saveFailed, draftWritesAllowed, retryDraftSave, draftRejected, recoveryRaw]
    );

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
    const { loadBuildFromFile, createBuildSnapshot, loadBuildSnapshot, invalidateBuildImport } =
        useEquipmentBuildTransfer({
            data: buildImportData,
            backpack,
            setBackpack,
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
            onBuildImported: handleBackpackImport,
        });

    const restoreHistory = useCallback(
        (snapshot) => {
            invalidateBuildImport();
            invalidateDrifOptimization();
            void cancelDrifOptimization().catch(() => {});
            clearReorganizationUndo();
            clearRemovalHistory();
            setRequestData(snapshot.requestData);
            setCharacterConfig(snapshot.characterConfig);
            setBackpack(snapshot.backpack);
            replaceLocks(snapshot.lockedSlots, snapshot.lockedDrifs);
            setBackpackImportRevision((revision) => revision + 1);
            markEquipmentChanged();
            if (
                equipmentRequestIdentity(snapshot.requestData) !==
                equipmentRequestIdentity(requestData)
            ) {
                restoreStats(null);
                void calculateStatsFor(snapshot.requestData);
            }
        },
        [
            invalidateBuildImport,
            invalidateDrifOptimization,
            cancelDrifOptimization,
            clearReorganizationUndo,
            clearRemovalHistory,
            replaceLocks,
            restoreStats,
            markEquipmentChanged,
            calculateStatsFor,
            requestData,
        ]
    );
    const historyValue = useEquipmentHistory({
        value: workingDraft,
        enabled: draftRestored && !loading && !initialDataError,
        catalog: data,
        gameRules,
        onRestore: restoreHistory,
    });

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
            backpack,
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
            canUndoReorganization,
            reorganizationUndoWarning,
            undoReorganization,
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
            backpack,
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
            canUndoReorganization,
            reorganizationUndoWarning,
            undoReorganization,
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

    const backpackValue = useMemo(
        () => ({
            backpack,
            backpackImportRevision,
            onBackpackChange: handleBackpackChange,
            ...backpackTransfer,
        }),
        [backpack, backpackImportRevision, handleBackpackChange, backpackTransfer]
    );

    const hasWorkingBuild =
        Object.values(requestData.slots).some((slot) => slot?.itemId) ||
        backpack.length > 0 ||
        characterConfig != null ||
        Object.keys(requestData.characterStats).length > 0;
    const buildActionsValue = useMemo(
        () => ({ createBuildSnapshot, loadBuildSnapshot, loadBuildFromFile, hasWorkingBuild }),
        [createBuildSnapshot, loadBuildSnapshot, loadBuildFromFile, hasWorkingBuild]
    );
    return (
        <EquipmentStorageContext.Provider value={storageValue}>
            <EquipmentHistoryContext.Provider value={historyValue}>
                <EquipmentBackpackContext.Provider value={backpackValue}>
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
                </EquipmentBackpackContext.Provider>
            </EquipmentHistoryContext.Provider>
        </EquipmentStorageContext.Provider>
    );
};
