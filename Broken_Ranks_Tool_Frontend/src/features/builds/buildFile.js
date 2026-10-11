import { validateImportedBuild } from "./buildImportValidation";
import { parseGameBuildPayload } from "./gameBuildFile";
import { normalizeTrailingOrbSlots } from "../../shared/domain/equipment/orbSelectionNormalization";
import {
    normalizeCharacterConfig,
    totalPointsForLevel,
    trimSpentPoints,
} from "../builder/character/characterDevelopmentDomain";

import { createBuildPayload } from "./buildPayload";
export { BUILD_FILE_FORMAT, BUILD_FILE_VERSION, createBuildPayload } from "./buildPayload";
export { downloadBuildPayload } from "./buildDownloads";
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
    const normalized = Object.fromEntries(
        ["itemId", "itemStars", "drifIds", "drifLevels", "orbIds", "orbLevels"]
            .filter((key) => Object.hasOwn(slot, key))
            .map((key) => [key, slot[key]])
    );
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

    if (BUILD_FILE_READERS.has(payload?.format)) {
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
    const reader = BUILD_FILE_READERS.get(payload?.format)?.get(payload?.version);
    if (!reader) {
        throw new Error("Nieobsługiwany format lub wersja pliku buildu.");
    }
    return reader(payload.build, data);
};

/** v1 stays registered when the export version changes. Never reuse a version for a new shape. */
const readVersionOneBuild = (build, data) => {
    const originalRequest = build?.requestData;
    const importedRequest = isObject(originalRequest?.slots)
        ? {
              ...originalRequest,
              slots: Object.fromEntries(
                  Object.entries(originalRequest.slots).map(([key, slot]) => [
                      key,
                      normalizeTrailingOrbSlots(slot),
                  ])
              ),
          }
        : originalRequest;
    const { lockedSlots, lockedDrifs } = validateImportedBuild(
        { ...build, requestData: importedRequest },
        data
    );

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

// Intentionally independent of BUILD_FILE_VERSION and the current export format constant.
const BUILD_FILE_READERS = new Map([
    ["broken-ranks-tool-build", new Map([[1, readVersionOneBuild]])],
]);
