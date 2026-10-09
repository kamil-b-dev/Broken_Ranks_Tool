import { useCallback, useEffect, useState } from "react";
import {
    MAX_SAVED_BUILDS,
    createLocalBuildRecord,
    normalizeBuildName,
    readBuildLibrary,
    replaceLocalBuildRecord,
    writeBuildLibrary,
    BUILD_LIBRARY_STORAGE_KEY,
    BUILD_LIBRARY_CHANGED_EVENT,
    withBuildLibraryLock,
} from "./buildLibraryStorage";
import { downloadBuildPayload } from "./buildFile";

/** Owns the persistent browser library and applies saved snapshots to the editor. */
export const useBuildLibrary = ({ createSnapshot, applySnapshot }) => {
    const [builds, setBuilds] = useState(() => readBuildLibrary());
    const [notice, setNotice] = useState(null);

    useEffect(() => {
        const refresh = (event) => {
            if (
                event.type !== "storage" ||
                event.key == null ||
                event.key === BUILD_LIBRARY_STORAGE_KEY
            ) {
                setBuilds(readBuildLibrary());
            }
        };
        window.addEventListener("storage", refresh);
        window.addEventListener(BUILD_LIBRARY_CHANGED_EVENT, refresh);
        return () => {
            window.removeEventListener("storage", refresh);
            window.removeEventListener(BUILD_LIBRARY_CHANGED_EVENT, refresh);
        };
    }, []);

    const commit = useCallback(async (update) => {
        try {
            await withBuildLibraryLock(() => writeBuildLibrary(update(readBuildLibrary())));
        } catch (error) {
            setBuilds(readBuildLibrary());
            throw error;
        }
        setBuilds(readBuildLibrary());
        window.dispatchEvent(new Event(BUILD_LIBRARY_CHANGED_EVENT));
    }, []);

    const saveCurrent = useCallback(
        async (name) => {
            try {
                const record = createLocalBuildRecord({ name, snapshot: createSnapshot() });
                await commit((latest) => {
                    if (latest.length >= MAX_SAVED_BUILDS)
                        throw new Error(
                            `Biblioteka mieści maksymalnie ${MAX_SAVED_BUILDS} buildów.`
                        );
                    return [...latest, record];
                });
                setNotice({
                    type: "success",
                    message: `Zapisano lokalnie build „${record.name}”.`,
                });
                return record;
            } catch (error) {
                setNotice({
                    type: "error",
                    message: `Nie udało się zapisać buildu: ${error.message}`,
                });
                return null;
            }
        },
        [commit, createSnapshot]
    );

    const overwrite = useCallback(
        async (id) => {
            try {
                const existing = builds.find((build) => build.id === id);
                if (!existing) throw new Error("Nie znaleziono wybranego buildu.");
                const snapshot = createSnapshot();
                await commit((latest) => {
                    requireUnchangedRecord(latest, existing);
                    return latest.map((build) =>
                        build.id === id ? replaceLocalBuildRecord(build, snapshot) : build
                    );
                });
                setNotice({
                    type: "success",
                    message: `Zaktualizowano lokalny build „${existing.name}”.`,
                });
            } catch (error) {
                setNotice({
                    type: "error",
                    message: `Nie udało się nadpisać buildu: ${error.message}`,
                });
            }
        },
        [builds, commit, createSnapshot]
    );

    const rename = useCallback(
        async (id, name) => {
            try {
                const existing = builds.find((build) => build.id === id);
                if (!existing) throw new Error("Nie znaleziono wybranego buildu.");
                const normalizedName = normalizeBuildName(name, existing.name);
                await commit((latest) => {
                    requireUnchangedRecord(latest, existing);
                    return latest.map((build) =>
                        build.id === id
                            ? {
                                  ...build,
                                  name: normalizedName,
                                  updatedAt: new Date().toISOString(),
                              }
                            : build
                    );
                });
                setNotice({
                    type: "success",
                    message: `Zmieniono nazwę buildu na „${normalizedName}”.`,
                });
                return true;
            } catch (error) {
                setNotice({
                    type: "error",
                    message: `Nie udało się zmienić nazwy buildu: ${error.message}`,
                });
                return false;
            }
        },
        [builds, commit]
    );

    const load = useCallback(
        (id) => {
            try {
                const record = builds.find((build) => build.id === id);
                if (!record) throw new Error("Nie znaleziono wybranego buildu.");
                applySnapshot(record);
                setNotice({ type: "success", message: `Wczytano lokalny build „${record.name}”.` });
                return true;
            } catch (error) {
                setNotice({
                    type: "error",
                    message: `Nie udało się wczytać buildu: ${error.message}`,
                });
                return false;
            }
        },
        [applySnapshot, builds]
    );

    const exportBuild = useCallback(
        (id) => {
            try {
                const record = builds.find((build) => build.id === id);
                if (!record) throw new Error("Nie znaleziono wybranego buildu.");
                downloadBuildPayload(record.payload);
                setNotice({
                    type: "success",
                    message: `Wyeksportowano build „${record.name}” do pliku JSON.`,
                });
                return true;
            } catch (error) {
                setNotice({
                    type: "error",
                    message: `Nie udało się wyeksportować buildu: ${error.message}`,
                });
                return false;
            }
        },
        [builds]
    );

    const remove = useCallback(
        async (id) => {
            const record = builds.find((build) => build.id === id);
            if (!record) return;
            try {
                await commit((latest) => {
                    requireUnchangedRecord(latest, record);
                    return latest.filter((build) => build.id !== id);
                });
                setNotice({ type: "success", message: `Usunięto build „${record.name}”.` });
            } catch (error) {
                setNotice({
                    type: "error",
                    message: `Nie udało się usunąć buildu: ${error.message}`,
                });
            }
        },
        [builds, commit]
    );

    return {
        builds,
        notice,
        saveCurrent,
        overwrite,
        rename,
        load,
        exportBuild,
        remove,
        dismissNotice: () => setNotice(null),
    };
};

const requireUnchangedRecord = (latest, expected) => {
    if (
        JSON.stringify(latest.find((record) => record.id === expected.id)) !==
        JSON.stringify(expected)
    ) {
        throw new Error(
            "Build zmienił się lub został usunięty w innej karcie. Sprawdź aktualną wersję przed ponowieniem zmiany."
        );
    }
};
