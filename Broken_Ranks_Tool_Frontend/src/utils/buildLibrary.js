export const BUILD_LIBRARY_STORAGE_KEY = "broken-ranks-tool.build-library.v1";
export const BUILD_LIBRARY_VERSION = 1;
export const MAX_SAVED_BUILDS = 10;

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

/** Reads a detached, bounded build library. Invalid or obsolete data is ignored. */
export const readBuildLibrary = (storage = globalThis.localStorage) => {
    if (!storage) return [];
    try {
        const stored = JSON.parse(storage.getItem(BUILD_LIBRARY_STORAGE_KEY) || "null");
        if (stored?.version !== BUILD_LIBRARY_VERSION || !Array.isArray(stored.builds)) return [];
        return cloneJson(stored.builds.filter(isStoredBuildRecord).slice(0, MAX_SAVED_BUILDS));
    } catch {
        return [];
    }
};

/** Persists the complete local build library as one versioned document. */
export const writeBuildLibrary = (builds, storage = globalThis.localStorage) => {
    if (!storage) throw new Error("Pamięć lokalna przeglądarki jest niedostępna.");
    if (!Array.isArray(builds) || builds.length > MAX_SAVED_BUILDS) {
        throw new Error(`Możesz zapisać maksymalnie ${MAX_SAVED_BUILDS} buildów.`);
    }
    storage.setItem(
        BUILD_LIBRARY_STORAGE_KEY,
        JSON.stringify({ version: BUILD_LIBRARY_VERSION, builds })
    );
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
