import { useCallback, useLayoutEffect, useRef } from "react";
import { createBuildPayload } from "./buildPayload";

/** Owns snapshot and JSON transfer operations for the shared equipment state. */
export const useEquipmentBuildTransfer = ({
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
    calculateStatsFor,
    markEquipmentChanged,
}) => {
    const importVersion = useRef(0);
    const snapshot = useRef({
        requestData,
        characterConfig,
        lockedSlots,
        lockedDrifs,
        stats,
        statSources,
    });
    useLayoutEffect(() => {
        snapshot.current = {
            requestData,
            characterConfig,
            lockedSlots,
            lockedDrifs,
            stats,
            statSources,
        };
    }, [requestData, characterConfig, lockedSlots, lockedDrifs, stats, statSources]);
    const createBuildSnapshot = useCallback(
        () => ({
            payload: createBuildPayload(snapshot.current),
            stats: snapshot.current.stats,
            statSources: snapshot.current.statSources,
        }),
        []
    );

    const applyImportedBuild = useCallback(
        (importedBuild) => {
            setRequestData(importedBuild.requestData);
            setCharacterConfig(importedBuild.characterConfig);
            replaceLocks(importedBuild.lockedSlots, importedBuild.lockedDrifs);
            // Persisted statistics describe the catalogue at save time, not the current rules.
            restoreStats(null);
            markEquipmentChanged();
            void calculateStatsFor(importedBuild.requestData);
        },
        [
            calculateStatsFor,
            markEquipmentChanged,
            replaceLocks,
            restoreStats,
            setCharacterConfig,
            setRequestData,
        ]
    );

    const loadBuildSnapshot = useCallback(
        async (snapshot) => {
            const version = ++importVersion.current;
            const { parseBuildPayload } = await import("./buildFile");
            if (version !== importVersion.current) return false;
            const importedBuild = parseBuildPayload(snapshot?.payload, data);
            applyImportedBuild(importedBuild);
            return true;
        },
        [applyImportedBuild, data]
    );

    const loadBuildFromFile = useCallback(
        async (file) => {
            const version = ++importVersion.current;
            try {
                const { parseBuildFile } = await import("./buildFile");
                if (version !== importVersion.current) return false;
                const importedBuild = await parseBuildFile(file, data);
                if (version !== importVersion.current) return false;
                applyImportedBuild(importedBuild);
                return importedBuild.importSummary || null;
            } catch (error) {
                if (version !== importVersion.current) return false;
                throw error;
            }
        },
        [applyImportedBuild, data]
    );

    return { loadBuildFromFile, createBuildSnapshot, loadBuildSnapshot };
};
