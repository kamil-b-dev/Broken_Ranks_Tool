export const BUILD_LIBRARY_STORAGE_KEY = "broken-ranks-tool.build-library.v1";
export const BUILD_LIBRARY_VERSION = 1;
export const MAX_SAVED_BUILDS = 10;
export const BUILD_LIBRARY_CHANGED_EVENT = "broken-ranks-tool:build-library-changed";
export const BUILD_LIBRARY_RECOVERY_KEY = `${BUILD_LIBRARY_STORAGE_KEY}.recovery`;
export const LIBRARY_RECOVERY_MESSAGE =
    "Biblioteka zawiera uszkodzone lub nieobsługiwane dane. Zapis jest zablokowany. Pobierz kopię danych przed ich odzyskaniem.";

/** Serializes read/modify/write operations across tabs of the same origin. */
export const withBuildLibraryLock = async (operation) => {
    if (!globalThis.navigator?.locks?.request) {
        throw new Error(
            "Bezpieczny zapis biblioteki wymaga obsługi Web Locks przez przeglądarkę i adresu HTTPS lub localhost."
        );
    }
    return navigator.locks.request(BUILD_LIBRARY_STORAGE_KEY, { mode: "exclusive" }, operation);
};

const cloneJson = (value) => JSON.parse(JSON.stringify(value));
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

const createId = () =>
    globalThis.crypto?.randomUUID?.() ||
    `build-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const normalizeBuildName = (name, fallback = "Nowy build") => {
    const normalized = String(name || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 48);
    return normalized || fallback;
};

export const createLocalBuildRecord = ({
    name,
    snapshot,
    id = createId(),
    savedAt = new Date().toISOString(),
}) => {
    if (!isObject(snapshot?.payload?.build)) {
        throw new Error("Nie można zapisać pustej konfiguracji buildu.");
    }

    return {
        id,
        name: normalizeBuildName(name),
        savedAt,
        updatedAt: savedAt,
        payload: cloneJson(snapshot.payload),
        stats: isObject(snapshot.stats) ? cloneJson(snapshot.stats) : null,
        statSources: isObject(snapshot.statSources) ? cloneJson(snapshot.statSources) : {},
    };
};

const isStoredBuildRecord = (record) =>
    isObject(record) &&
    typeof record.id === "string" &&
    typeof record.name === "string" &&
    typeof record.savedAt === "string" &&
    isObject(record.payload?.build);

/** Retains readable records for export, but never treats rejected data as an empty writable library. */
export const readBuildLibraryState = (storage) => {
    try {
        storage = storage === undefined ? globalThis.localStorage : storage;
        if (!storage) throw new Error("storage unavailable");
        const raw = storage.getItem(BUILD_LIBRARY_STORAGE_KEY);
        if (raw == null) return { builds: [], rejected: false, raw: null };
        try {
            const stored = JSON.parse(raw);
            if (stored?.version !== BUILD_LIBRARY_VERSION || !Array.isArray(stored.builds))
                return { builds: [], rejected: true, raw };
            const ids = new Set();
            const valid = stored.builds.filter((record) => {
                if (!isStoredBuildRecord(record) || ids.has(record.id)) return false;
                ids.add(record.id);
                return true;
            });
            return {
                builds: cloneJson(valid.slice(0, MAX_SAVED_BUILDS)),
                rejected: valid.length !== stored.builds.length || valid.length > MAX_SAVED_BUILDS,
                raw,
            };
        } catch {
            return { builds: [], rejected: true, raw };
        }
    } catch {
        return { builds: [], rejected: true, unavailable: true, raw: null };
    }
};
export const readBuildLibrary = (storage) => readBuildLibraryState(storage).builds;

/** Persists the complete local build library as one versioned document. */
export const writeBuildLibrary = (builds, storage) => {
    try {
        storage = storage === undefined ? globalThis.localStorage : storage;
    } catch {
        throw new Error("Pamięć lokalna przeglądarki jest niedostępna.");
    }
    if (!storage) throw new Error("Pamięć lokalna przeglądarki jest niedostępna.");
    const current = readBuildLibraryState(storage);
    if (current.unavailable) throw new Error("Pamięć lokalna przeglądarki jest niedostępna.");
    if (current.rejected) throw new Error(LIBRARY_RECOVERY_MESSAGE);
    if (!Array.isArray(builds) || builds.length > MAX_SAVED_BUILDS) {
        throw new Error(`Możesz zapisać maksymalnie ${MAX_SAVED_BUILDS} buildów.`);
    }
    storage.setItem(
        BUILD_LIBRARY_STORAGE_KEY,
        JSON.stringify({ version: BUILD_LIBRARY_VERSION, builds })
    );
};

/** Called under the same Web Lock as normal writes; archive exact bytes before replacing anything. */
export const recoverBuildLibrary = (storage = globalThis.localStorage) => {
    const current = readBuildLibraryState(storage);
    if (current.unavailable) throw new Error("Pamięć lokalna przeglądarki jest niedostępna.");
    if (!current.rejected) return current.builds;
    let key = BUILD_LIBRARY_RECOVERY_KEY;
    if (storage.getItem(key) != null && storage.getItem(key) !== current.raw)
        key = `${key}.${createId()}`;
    storage.setItem(key, current.raw);
    if (storage.getItem(key) !== current.raw) throw new Error(LIBRARY_RECOVERY_MESSAGE);
    storage.setItem(
        BUILD_LIBRARY_STORAGE_KEY,
        JSON.stringify({ version: BUILD_LIBRARY_VERSION, builds: current.builds })
    );
    return current.builds;
};

export const replaceLocalBuildRecord = (
    record,
    snapshot,
    updatedAt = new Date().toISOString()
) => ({
    ...createLocalBuildRecord({
        name: record.name,
        snapshot,
        id: record.id,
        savedAt: record.savedAt,
    }),
    updatedAt,
});
