import { validateImportedBuild } from "./buildImportValidation";
import { parseGameBuildPayload } from "./gameBuildFile";
import {
    normalizeCharacterConfig,
    totalPointsForLevel,
    trimSpentPoints,
} from "../builder/character/characterDevelopmentDomain";

export const BUILD_FILE_FORMAT = "broken-ranks-tool-build";
export const BUILD_FILE_VERSION = 1;
export const MAX_BUILD_FILE_SIZE = 5 * 1024 * 1024;

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

const cloneJson = (value) => JSON.parse(JSON.stringify(value));

const normalizeImportedCharacterConfig = (config) => {
    if (!isObject(config)) return null;
    const normalized = normalizeCharacterConfig(config);
    return {
        ...normalized,
        spentPoints: trimSpentPoints(normalized.spentPoints, totalPointsForLevel(normalized.level)),
    };
};

// Legacy files may store drif levels in arrays and orb levels in index maps.
// Publish the container shapes expected by EquipmentRequest after validation.
const normalizeSlotLevels = (slot) => {
    const normalized = { ...slot };
    if (slot.drifLevels != null) {
        normalized.drifLevels = Object.fromEntries(
            Object.entries(slot.drifLevels).map(([index, level]) => [index, Number(level)])
        );
    }
    if (slot.orbLevels != null) {
        const count = Array.isArray(slot.orbLevels)
            ? slot.orbLevels.length
            : Math.max(-1, ...Object.keys(slot.orbLevels).map(Number)) + 1;
        normalized.orbLevels = Array.from({ length: count }, (_, index) =>
            Number(slot.orbLevels[index] ?? 1)
        );
    }
    return normalized;
};

/**
 * Creates the versioned file payload used by the build export action.
 * @param {object} build Current build state.
 * @returns {object} Serializable build payload.
 */
export const createBuildPayload = ({ requestData, characterConfig, lockedSlots, lockedDrifs }) => ({
    format: BUILD_FILE_FORMAT,
    version: BUILD_FILE_VERSION,
    exportedAt: new Date().toISOString(),
    build: {
        requestData,
        characterConfig,
        lockedSlots,
        lockedDrifs,
    },
});

/** Downloads a serialized build payload and releases the temporary browser URL. */
export const downloadBuildPayload = (payload, date = new Date()) => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `broken-ranks-build-${date.toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/**
 * Reads and validates an exported build against currently available game data.
 * @param {File} file Build file selected by the user.
 * @param {object} data Current item, orb, and drif collections.
 * @returns {Promise<object>} Validated state ready for React state updates.
 * @throws {Error} If the file is invalid or references unknown templates.
 */
export const parseBuildFile = async (file, data = {}) => {
    if (!file) throw new Error("Nie wybrano pliku buildu.");
    if (file.size > MAX_BUILD_FILE_SIZE) throw new Error("Plik buildu jest zbyt duży.");

    let payload;
    try {
        payload = JSON.parse(await file.text());
    } catch {
        throw new Error("Plik nie zawiera poprawnego JSON-a.");
    }

    if (payload?.format === BUILD_FILE_FORMAT) {
        return parseBuildPayload(payload, data);
    }
    if (payload?.stats && payload?.equipped && payload?.equipmentList) {
        const imported = parseGameBuildPayload(payload, data);
        return {
            ...parseBuildPayload(createBuildPayload(imported), data),
            importSummary: imported.importSummary,
        };
    }
    return parseBuildPayload(payload, data);
};

/**
 * Validates an in-memory build payload against currently available game data.
 * Used by both JSON imports and the local build library.
 */
export const parseBuildPayload = (payload, data = {}) => {
    if (payload?.format !== BUILD_FILE_FORMAT || payload?.version !== BUILD_FILE_VERSION) {
        throw new Error("Nieobsługiwany format lub wersja pliku buildu.");
    }

    const build = payload.build;
    const importedRequest = build?.requestData;
    const { lockedSlots, lockedDrifs } = validateImportedBuild(build, data);

    return {
        requestData: cloneJson({
            slots: Object.fromEntries(
                Object.entries(importedRequest.slots).map(([key, slot]) => [
                    key,
                    normalizeSlotLevels(slot),
                ])
            ),
            characterStats: importedRequest.characterStats || {},
        }),
        characterConfig: normalizeImportedCharacterConfig(build.characterConfig),
        lockedSlots: [...lockedSlots],
        lockedDrifs: cloneJson(lockedDrifs),
    };
};
