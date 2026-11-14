export const ANALYSIS_ARCHIVE_KEY = "broken-ranks-tool.analysis-archive.v1";
const MAX_BYTES = 4 * 1024 * 1024;
export const readAnalysisArchive = (storage = localStorage) => {
    const raw = storage.getItem(ANALYSIS_ARCHIVE_KEY);
    if (raw == null) return [];
    try {
        if (new TextEncoder().encode(raw).length > MAX_BYTES) throw new Error();
        const value = JSON.parse(raw);
        if (
            value.version !== 1 ||
            !Array.isArray(value.entries) ||
            value.entries.length > 10 ||
            value.entries.some(
                (entry) =>
                    typeof entry.id !== "string" ||
                    typeof entry.savedAt !== "string" ||
                    !entry.document?.status ||
                    !entry.document?.input ||
                    (entry.document.status.nextVariants != null &&
                        (!Array.isArray(entry.document.status.nextVariants) ||
                            entry.document.status.nextVariants.length > 6))
            )
        )
            throw new Error();
        return value.entries;
    } catch {
        throw new Error(
            "Archiwum analiz jest uszkodzone. Pobierz jego kopię przed odzyskaniem danych."
        );
    }
};
const mutate = async (update) => {
    if (!navigator.locks?.request)
        throw new Error(
            "Bezpieczny zapis archiwum wymaga HTTPS lub localhost i obsługi Web Locks."
        );
    return navigator.locks.request(ANALYSIS_ARCHIVE_KEY, { mode: "exclusive" }, () => {
        const entries = update(readAnalysisArchive());
        const json = JSON.stringify({ version: 1, entries });
        if (new TextEncoder().encode(json).length > MAX_BYTES)
            throw new Error(
                "Archiwum przekracza 4 MB. Usuń starszą analizę lub pobierz ją do pliku."
            );
        localStorage.setItem(ANALYSIS_ARCHIVE_KEY, json);
        return entries;
    });
};
export const saveAnalysis = (document) =>
    mutate((entries) => {
        if (!document?.status || !document.input)
            throw new Error("Brak zakończonej analizy do zapisania.");
        if (entries.length >= 10)
            throw new Error("Archiwum mieści 10 analiz. Usuń wybraną starszą analizę.");
        return [
            ...entries,
            {
                id: crypto.randomUUID(),
                savedAt: new Date().toISOString(),
                document: structuredClone(document),
            },
        ];
    });
export const removeAnalysis = (id) =>
    mutate((entries) => entries.filter((entry) => entry.id !== id));

export const recoverAnalysisArchive = async () => {
    if (!navigator.locks?.request)
        throw new Error(
            "Bezpieczny zapis archiwum wymaga HTTPS lub localhost i obsługi Web Locks."
        );
    return navigator.locks.request(ANALYSIS_ARCHIVE_KEY, { mode: "exclusive" }, () => {
        try {
            return readAnalysisArchive();
        } catch {
            /* Preserve exact bytes before unlocking writes. */
        }
        const raw = localStorage.getItem(ANALYSIS_ARCHIVE_KEY);
        const key = `${ANALYSIS_ARCHIVE_KEY}.recovery.${crypto.randomUUID()}`;
        localStorage.setItem(key, raw);
        if (localStorage.getItem(key) !== raw)
            throw new Error("Nie udało się zachować kopii archiwum.");
        localStorage.setItem(ANALYSIS_ARCHIVE_KEY, JSON.stringify({ version: 1, entries: [] }));
        return [];
    });
};
