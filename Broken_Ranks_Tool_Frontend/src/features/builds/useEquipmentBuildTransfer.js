import { useCallback } from "react";
import {
    createBuildPayload,
    downloadBuildPayload,
    parseBuildFile,
    parseBuildPayload,
} from "./buildFile";

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
        (importedBuild, savedStats = null, savedStatSources = {}) => {
            setRequestData(importedBuild.requestData);
            setCharacterConfig(importedBuild.characterConfig);
            replaceLocks(importedBuild.lockedSlots, importedBuild.lockedDrifs);
            restoreStats(savedStats, savedStatSources, importedBuild.requestData);
            markEquipmentChanged();
        },
        [markEquipmentChanged, replaceLocks, restoreStats, setCharacterConfig, setRequestData]
    );

    const saveBuildToFile = useCallback(() => {
        const { payload } = createBuildSnapshot();
        downloadBuildPayload(payload);
    }, [createBuildSnapshot]);

    const loadBuildSnapshot = useCallback(
        (snapshot) => {
            const importedBuild = parseBuildPayload(snapshot?.payload, data);
            applyImportedBuild(importedBuild, snapshot?.stats, snapshot?.statSources);
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

    return { saveBuildToFile, loadBuildFromFile, createBuildSnapshot, loadBuildSnapshot };
};
