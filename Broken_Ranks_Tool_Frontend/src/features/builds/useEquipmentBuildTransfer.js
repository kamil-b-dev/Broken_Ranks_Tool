import { useCallback } from "react";
import { createBuildPayload, parseBuildFile, parseBuildPayload } from "./buildFile";

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
        (snapshot) => {
            const importedBuild = parseBuildPayload(snapshot?.payload, data);
            applyImportedBuild(importedBuild);
        },
        [applyImportedBuild, data]
    );

    const loadBuildFromFile = useCallback(
        async (file) => {
            const importedBuild = await parseBuildFile(file, data);
            applyImportedBuild(importedBuild);
            return importedBuild.importSummary || null;
        },
        [applyImportedBuild, data]
    );

    return { loadBuildFromFile, createBuildSnapshot, loadBuildSnapshot };
};
