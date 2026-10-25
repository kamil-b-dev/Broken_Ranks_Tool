export const LEGACY_EQUIPMENT_DRAFT_STORAGE_KEY = "broken-ranks-tool.equipment-draft.v1";
export const VERSION_TWO_EQUIPMENT_DRAFT_STORAGE_KEY = "broken-ranks-tool.equipment-draft.v2";
export const EQUIPMENT_DRAFT_STORAGE_KEY = "broken-ranks-tool.equipment-draft.v3";
export const EQUIPMENT_DRAFT_VERSION = 3;
export const EQUIPMENT_DRAFT_RECOVERY_STORAGE_KEY = `${EQUIPMENT_DRAFT_STORAGE_KEY}.recovery`;
export const OPTIMIZER_DRAFT_STORAGE_KEY = "broken-ranks-tool.optimizer-draft.v1";
export const WORKING_DRAFT_VERSION = 1;

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const cloneJson = (value) => JSON.parse(JSON.stringify(value));

const readVersionedValue = (key, storage) => {
    try {
        storage = storage === undefined ? globalThis.localStorage : storage;
        if (!storage) return null;
        const stored = JSON.parse(storage.getItem(key) || "null");
        return stored?.version === WORKING_DRAFT_VERSION ? stored.value : null;
    } catch {
        return null;
    }
};

const writeVersionedValue = (key, value, storage) => {
    try {
        storage = storage === undefined ? globalThis.localStorage : storage;
        if (!storage) return false;
        const raw = storage.getItem(key);
        if (raw != null) {
            let valid = false;
            try {
                const existing = JSON.parse(raw);
                valid = existing?.version === WORKING_DRAFT_VERSION && isObject(existing.value);
            } catch {
                /* Preserve unreadable data before replacing it. */
            }
            if (!valid && !preserveEquipmentDraft(storage, key)) return false;
        }
        storage.setItem(key, JSON.stringify({ version: WORKING_DRAFT_VERSION, value }));
        return true;
    } catch {
        return false;
    }
};

/** Reads current or legacy draft metadata without losing an unsupported newer document. */
export const readEquipmentDraftState = (storage) => {
    let sourceKey = EQUIPMENT_DRAFT_STORAGE_KEY;
    try {
        storage = storage === undefined ? globalThis.localStorage : storage;
        if (!storage) return { draft: null, rejected: false };
        let raw = storage.getItem(sourceKey);
        if (raw == null) {
            sourceKey = VERSION_TWO_EQUIPMENT_DRAFT_STORAGE_KEY;
            raw = storage.getItem(sourceKey);
        }
        if (raw == null) {
            sourceKey = LEGACY_EQUIPMENT_DRAFT_STORAGE_KEY;
            raw = storage.getItem(sourceKey);
        }
        if (raw == null) return { draft: null, rejected: false };
        const stored = JSON.parse(raw);
        const expected =
            sourceKey === EQUIPMENT_DRAFT_STORAGE_KEY
                ? 3
                : sourceKey === VERSION_TWO_EQUIPMENT_DRAFT_STORAGE_KEY
                  ? 2
                  : 1;
        const draft = stored?.value;
        if (
            stored?.version !== expected ||
            !isObject(draft?.requestData) ||
            !isObject(draft.requestData.slots) ||
            (expected >= 2 && !Array.isArray(draft.backpack))
        )
            return { draft: null, rejected: true, sourceKey };
        return {
            rejected: false,
            sourceKey,
            buildVersion: expected,
            draft: cloneJson({
                requestData: {
                    slots: draft.requestData.slots,
                    characterStats: isObject(draft.requestData.characterStats)
                        ? draft.requestData.characterStats
                        : {},
                },
                characterConfig: isObject(draft.characterConfig) ? draft.characterConfig : null,
                lockedSlots: Array.isArray(draft.lockedSlots) ? draft.lockedSlots : [],
                lockedDrifs: isObject(draft.lockedDrifs) ? draft.lockedDrifs : {},
                ...(expected >= 2 ? { backpack: draft.backpack } : {}),
            }),
        };
    } catch {
        return { draft: null, rejected: true, sourceKey };
    }
};

export const readEquipmentDraft = (storage) => readEquipmentDraftState(storage).draft;

/** New writes go to v3; migration never overwrites the original v1/v2 keys. */
export const writeEquipmentDraft = (draft, storage) => {
    try {
        storage = storage === undefined ? globalThis.localStorage : storage;
        if (!storage) return false;
        const existing = readEquipmentDraftState(storage);
        if (existing.rejected && !preserveEquipmentDraft(storage, existing.sourceKey)) return false;
        storage.setItem(
            EQUIPMENT_DRAFT_STORAGE_KEY,
            JSON.stringify({
                version: EQUIPMENT_DRAFT_VERSION,
                value: { ...draft, backpack: draft.backpack || [] },
            })
        );
        return true;
    } catch {
        return false;
    }
};

export const preserveEquipmentDraft = (storage, sourceKey) => {
    try {
        storage = storage === undefined ? globalThis.localStorage : storage;
        if (!storage) return false;
        sourceKey ??=
            storage.getItem(EQUIPMENT_DRAFT_STORAGE_KEY) != null
                ? EQUIPMENT_DRAFT_STORAGE_KEY
                : storage.getItem(VERSION_TWO_EQUIPMENT_DRAFT_STORAGE_KEY) != null
                  ? VERSION_TWO_EQUIPMENT_DRAFT_STORAGE_KEY
                  : LEGACY_EQUIPMENT_DRAFT_STORAGE_KEY;
        const raw = storage.getItem(sourceKey);
        if (raw != null) {
            let recoveryKey = sourceKey + ".recovery";
            const existing = storage.getItem(recoveryKey);
            if (existing != null && existing !== raw)
                recoveryKey += `.${globalThis.crypto.randomUUID()}`;
            storage.setItem(recoveryKey, raw);
            if (storage.getItem(recoveryKey) !== raw) return false;
        }
        return true;
    } catch {
        return false;
    }
};

export const readEquipmentDraftRaw = (sourceKey, storage) => {
    try {
        storage ??= globalThis.localStorage;
        return storage?.getItem(sourceKey) ?? null;
    } catch {
        return null;
    }
};

/** Reads the last versioned optimizer configuration payload. */
export const readOptimizerDraft = (storage) => {
    const draft = readVersionedValue(OPTIMIZER_DRAFT_STORAGE_KEY, storage);
    return isObject(draft) ? cloneJson(draft) : null;
};

/** Saves the current optimizer configuration without interrupting the user on storage errors. */
export const writeOptimizerDraft = (draft, storage) =>
    writeVersionedValue(OPTIMIZER_DRAFT_STORAGE_KEY, draft, storage);
