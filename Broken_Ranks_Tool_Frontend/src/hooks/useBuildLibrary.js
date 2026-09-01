import { useCallback, useState } from "react";
import {
    MAX_SAVED_BUILDS,
    createLocalBuildRecord,
    normalizeBuildName,
    readBuildLibrary,
    replaceLocalBuildRecord,
    writeBuildLibrary,
} from "../utils/buildLibrary";
import { downloadBuildPayload } from "../utils/buildFile";

/** Owns the persistent browser library and applies saved snapshots to the editor. */
export const useBuildLibrary = ({ createSnapshot, applySnapshot }) => {
    const [builds, setBuilds] = useState(() => readBuildLibrary());
    const [notice, setNotice] = useState(null);

    const commit = useCallback((nextBuilds) => {
        writeBuildLibrary(nextBuilds);
        setBuilds(nextBuilds);
    }, []);

    const saveCurrent = useCallback(
        (name) => {
            try {
                if (builds.length >= MAX_SAVED_BUILDS) {
                    throw new Error(`Biblioteka mieści maksymalnie ${MAX_SAVED_BUILDS} buildów.`);
                }
                const record = createLocalBuildRecord({ name, snapshot: createSnapshot() });
                commit([...builds, record]);
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
        [builds, commit, createSnapshot]
    );

    const overwrite = useCallback(
        (id) => {
            try {
                const existing = builds.find((build) => build.id === id);
                if (!existing) throw new Error("Nie znaleziono wybranego buildu.");
                const next = builds.map((build) =>
                    build.id === id ? replaceLocalBuildRecord(build, createSnapshot()) : build
                );
                commit(next);
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
        (id, name) => {
            try {
                const existing = builds.find((build) => build.id === id);
                if (!existing) throw new Error("Nie znaleziono wybranego buildu.");
                const normalizedName = normalizeBuildName(name, existing.name);
                const next = builds.map((build) =>
                    build.id === id
                        ? { ...build, name: normalizedName, updatedAt: new Date().toISOString() }
                        : build
                );
                commit(next);
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
        (id) => {
            const record = builds.find((build) => build.id === id);
            if (!record) return;
            try {
                commit(builds.filter((build) => build.id !== id));
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
