import { useCallback, useEffect, useRef, useState } from "react";
import {
    MAX_SAVED_BUILDS,
    createLocalBuildRecord,
    normalizeBuildName,
    readBuildLibrary,
    readBuildLibraryState,
    recoverBuildLibrary,
    LIBRARY_RECOVERY_MESSAGE,
    replaceLocalBuildRecord,
    writeBuildLibrary,
    BUILD_LIBRARY_STORAGE_KEY,
    BUILD_LIBRARY_CHANGED_EVENT,
    withBuildLibraryLock,
} from "./buildLibraryStorage";
import { downloadBuildPayload, downloadBuildText } from "./buildDownloads";

/** Owns the persistent browser library and applies saved snapshots to the editor. */
export const useBuildLibrary = ({ createSnapshot, applySnapshot }) => {
    const [storageState, setStorageState] = useState(() => readBuildLibraryState());
    const builds = storageState.builds;
    const setBuilds = useCallback((next) => {
        setStorageState({ ...readBuildLibraryState(), builds: next });
    }, []);
    const [notice, setNotice] = useState(null);
    const origin = useRef(Symbol("build-library"));

    useEffect(() => {
        const refresh = (event) => {
            if (event.detail?.origin === origin.current) return;
            if (
                event.type !== "storage" ||
                event.key == null ||
                event.key === BUILD_LIBRARY_STORAGE_KEY
            ) {
                setStorageState(readBuildLibraryState());
            }
        };
        window.addEventListener("storage", refresh);
        window.addEventListener(BUILD_LIBRARY_CHANGED_EVENT, refresh);
        return () => {
            window.removeEventListener("storage", refresh);
            window.removeEventListener(BUILD_LIBRARY_CHANGED_EVENT, refresh);
        };
    }, []);

    const commit = useCallback(
        async (update) => {
            let next;
            try {
                await withBuildLibraryLock(() => {
                    next = update(readBuildLibrary());
                    writeBuildLibrary(next);
                });
            } catch (error) {
                setBuilds(readBuildLibrary());
                throw error;
            }
            setBuilds(next);
            window.dispatchEvent(
                new CustomEvent(BUILD_LIBRARY_CHANGED_EVENT, { detail: { origin: origin.current } })
            );
        },
        [setBuilds]
    );

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
        async (id) => {
            try {
                const record = builds.find((build) => build.id === id);
                if (!record) throw new Error("Nie znaleziono wybranego buildu.");
                if ((await applySnapshot(record)) === false) return false;
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

    const downloadRecovery = () => {
        try {
            // Read again so a second tab's newer data is included.
            const current = readBuildLibraryState();
            if (current.raw == null)
                throw new Error("Pamięć lokalna przeglądarki jest niedostępna.");
            downloadBuildText(current.raw, "broken-ranks-library-recovery.json");
        } catch (error) {
            setNotice({ type: "error", message: error.message });
        }
    };
    const recover = async () => {
        try {
            await withBuildLibraryLock(() => recoverBuildLibrary());
            setStorageState(readBuildLibraryState());
            window.dispatchEvent(new CustomEvent(BUILD_LIBRARY_CHANGED_EVENT));
            setNotice({
                type: "success",
                message:
                    "Zachowano kopię oryginalnych danych. Odzyskano czytelne buildy i odblokowano zapis.",
            });
        } catch {
            setStorageState(readBuildLibraryState());
            setNotice({
                type: "error",
                message:
                    "Nie udało się zachować kopii biblioteki. Oryginalne dane nie zostały nadpisane.",
            });
        }
    };

    const exportLibrary = async () => {
        try {
            const current = readBuildLibraryState();
            if (current.rejected) throw new Error(LIBRARY_RECOVERY_MESSAGE);
            const { createLibraryBackup } = await import("./library-backup/libraryBackup");
            downloadBuildText(
                JSON.stringify(createLibraryBackup(current.builds), null, 2),
                "broken-ranks-library-backup.json"
            );
            return true;
        } catch (error) {
            setNotice({ type: "error", message: error.message });
            return false;
        }
    };
    const importLibrary = async (incoming, decisions, expected) => {
        try {
            const { mergeLibraryBackup, librarySnapshotIdentity } =
                await import("./library-backup/libraryBackup");
            await commit((latest) => {
                if (librarySnapshotIdentity(latest) !== expected)
                    throw new Error(
                        "Biblioteka zmieniła się podczas podglądu importu. Wczytaj kopię ponownie i sprawdź konflikty."
                    );
                return mergeLibraryBackup(latest, incoming, decisions);
            });
            setNotice({
                type: "success",
                message: "Zaimportowano wybrane buildy z kopii biblioteki.",
            });
            return true;
        } catch (error) {
            setNotice({ type: "error", message: error.message });
            return false;
        }
    };

    return {
        builds,
        exportLibrary,
        importLibrary,
        storageWarning: storageState.rejected
            ? storageState.unavailable
                ? "Pamięć lokalna przeglądarki jest niedostępna."
                : LIBRARY_RECOVERY_MESSAGE
            : null,
        canRecover: storageState.rejected && storageState.raw != null,
        downloadRecovery,
        recover,
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
