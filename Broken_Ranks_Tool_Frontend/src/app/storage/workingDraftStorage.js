export const EQUIPMENT_DRAFT_STORAGE_KEY = "broken-ranks-tool.equipment-draft.v1";
export const OPTIMIZER_DRAFT_STORAGE_KEY = "broken-ranks-tool.optimizer-draft.v1";
export const WORKING_DRAFT_VERSION = 1;

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const cloneJson = (value) => JSON.parse(JSON.stringify(value));

const readVersionedValue = (key, storage) => {
    if (!storage) return null;
    try {
        const stored = JSON.parse(storage.getItem(key) || "null");
        return stored?.version === WORKING_DRAFT_VERSION ? stored.value : null;
    } catch {
        return null;
    }
};

const writeVersionedValue = (key, value, storage) => {
    if (!storage) return false;
    try {
        storage.setItem(key, JSON.stringify({ version: WORKING_DRAFT_VERSION, value }));
        return true;
    } catch {
        return false;
    }
};

/** Reads the last automatically saved equipment workspace. */
export const readEquipmentDraft = (storage = globalThis.localStorage) => {
    const draft = readVersionedValue(EQUIPMENT_DRAFT_STORAGE_KEY, storage);
    if (!isObject(draft?.requestData) || !isObject(draft.requestData.slots)) return null;
    return cloneJson({
        requestData: {
            slots: draft.requestData.slots,
            characterStats: isObject(draft.requestData.characterStats)
                ? draft.requestData.characterStats
                : {},
        },
        characterConfig: isObject(draft.characterConfig) ? draft.characterConfig : null,
        lockedSlots: Array.isArray(draft.lockedSlots) ? draft.lockedSlots : [],
        lockedDrifs: isObject(draft.lockedDrifs) ? draft.lockedDrifs : {},
    });
};

/** Saves the current equipment workspace without interrupting the user on storage errors. */
export const writeEquipmentDraft = (draft, storage = globalThis.localStorage) =>
    writeVersionedValue(EQUIPMENT_DRAFT_STORAGE_KEY, draft, storage);

/** Reads the last versioned optimizer configuration payload. */
export const readOptimizerDraft = (storage = globalThis.localStorage) => {
    const draft = readVersionedValue(OPTIMIZER_DRAFT_STORAGE_KEY, storage);
    return isObject(draft) ? cloneJson(draft) : null;
};

/** Saves the current optimizer configuration without interrupting the user on storage errors. */
export const writeOptimizerDraft = (draft, storage = globalThis.localStorage) =>
    writeVersionedValue(OPTIMIZER_DRAFT_STORAGE_KEY, draft, storage);
