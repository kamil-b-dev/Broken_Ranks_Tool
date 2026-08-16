export const BUILD_FILE_FORMAT = "broken-ranks-tool-build";
export const BUILD_FILE_VERSION = 1;
export const MAX_BUILD_FILE_SIZE = 5 * 1024 * 1024;

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

const cloneJson = (value) => JSON.parse(JSON.stringify(value));

const validateKnownIds = (ids, knownIds, message) => {
    if (ids == null) return;
    if (!Array.isArray(ids)) throw new Error(message);

    ids.filter(Boolean).forEach((id) => {
        if (!knownIds.has(String(id))) throw new Error(message);
    });
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
        lockedDrifs
    }
});

/**
 * Reads and validates an exported build against currently available game data.
 * @param {File} file Build file selected by the user.
 * @param {object} data Current item, orb, and drif collections.
 * @returns {Promise<object>} Validated state ready for React state updates.
 * @throws {Error} If the file is invalid or references unknown templates.
 */
export const parseBuildFile = async (file, { items = [], orbs = [], drifs = [] }) => {
    if (!file) throw new Error("Nie wybrano pliku buildu.");
    if (file.size > MAX_BUILD_FILE_SIZE) throw new Error("Plik buildu jest zbyt duży.");

    let payload;
    try {
        payload = JSON.parse(await file.text());
    } catch {
        throw new Error("Plik nie zawiera poprawnego JSON-a.");
    }

    if (payload?.format !== BUILD_FILE_FORMAT || payload?.version !== BUILD_FILE_VERSION) {
        throw new Error("Nieobsługiwany format lub wersja pliku buildu.");
    }

    const build = payload.build;
    const importedRequest = build?.requestData;
    if (!isObject(importedRequest) || !isObject(importedRequest.slots)) {
        throw new Error("Plik nie zawiera poprawnej konfiguracji slotów.");
    }

    const knownItems = new Set(items.map((item) => String(item.id)));
    const knownOrbs = new Set(orbs.map((orb) => String(orb.id)));
    const knownDrifs = new Set(drifs.map((drif) => String(drif.id)));

    Object.entries(importedRequest.slots).forEach(([slotKey, slot]) => {
        if (!isObject(slot)) throw new Error(`Niepoprawne dane slota ${slotKey}.`);
        if (slot.itemId != null && !knownItems.has(String(slot.itemId))) {
            throw new Error(`Build odwołuje się do nieznanego przedmiotu w slocie ${slotKey}.`);
        }
        validateKnownIds(
            slot.orbIds,
            knownOrbs,
            `Build zawiera nieznane orby w slocie ${slotKey}.`
        );
        validateKnownIds(
            slot.drifIds,
            knownDrifs,
            `Build zawiera nieznane drify w slocie ${slotKey}.`
        );
    });

    return {
        requestData: cloneJson({
            slots: importedRequest.slots,
            characterStats: importedRequest.characterStats || {}
        }),
        characterConfig: build.characterConfig || null,
        lockedSlots: Array.isArray(build.lockedSlots) ? [...build.lockedSlots] : [],
        lockedDrifs: isObject(build.lockedDrifs) ? cloneJson(build.lockedDrifs) : {}
    };
};
