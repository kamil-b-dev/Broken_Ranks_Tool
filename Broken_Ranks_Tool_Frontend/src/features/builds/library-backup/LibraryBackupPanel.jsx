import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "../../../shared/i18n/useTranslation";
import AppNotice from "../../../shared/ui/AppNotice";
import {
    libraryConflicts,
    librarySnapshotIdentity,
    planLibraryImport,
    readLibraryBackup,
} from "./libraryBackup";
import "./library-backup.css";

export default function LibraryBackupPanel({ library, data }) {
    const { t } = useTranslation();
    const input = useRef(null);
    const revision = useRef(0);
    const [pending, setPending] = useState(null);
    const [decisions, setDecisions] = useState({});
    const [notice, setNotice] = useState(null);
    const [busy, setBusy] = useState(false);
    useEffect(
        () => () => {
            revision.current++;
        },
        []
    );
    const preview = useMemo(() => {
        if (!pending || pending.data !== data) return null;
        try {
            return { plan: planLibraryImport(pending.existing, pending.incoming, decisions) };
        } catch (error) {
            return { error: error.message };
        }
    }, [pending, data, decisions]);
    if (!library) return null;
    const read = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        const version = ++revision.current;
        const existing = structuredClone(library.builds);
        setBusy(true);
        setNotice(null);
        try {
            const incoming = await readLibraryBackup(file, data);
            if (version !== revision.current) return;
            setPending({ incoming, existing, expected: librarySnapshotIdentity(existing), data });
            setDecisions({});
        } catch (error) {
            if (version === revision.current) setNotice({ type: "error", message: error.message });
        } finally {
            if (version === revision.current) setBusy(false);
        }
    };
    const apply = async () => {
        const version = ++revision.current;
        setBusy(true);
        try {
            if (await library.importLibrary(pending.incoming, decisions, pending.expected))
                setPending(null);
        } finally {
            if (version === revision.current) setBusy(false);
        }
    };
    return (
        <section className="library-backup" aria-label={t("Kopia całej biblioteki")}>
            <div className="library-backup-actions">
                <button
                    type="button"
                    onClick={library.exportLibrary}
                    disabled={busy || Boolean(library.storageWarning)}
                >
                    {t("Pobierz całą bibliotekę")}
                </button>
                <button
                    type="button"
                    onClick={() => input.current.click()}
                    disabled={busy || Boolean(library.storageWarning)}
                >
                    {t("Wczytaj kopię biblioteki")}
                </button>
                <input
                    ref={input}
                    hidden
                    type="file"
                    accept=".json,application/json"
                    onChange={read}
                    aria-label={t("Plik kopii biblioteki")}
                />
            </div>
            {busy && <p role="status">{t("Przetwarzanie kopii biblioteki…")}</p>}
            <AppNotice notice={notice} onDismiss={() => setNotice(null)} />
            {preview && (
                <div className="library-backup-preview">
                    <h3>{t("Podgląd importu biblioteki")}</h3>
                    {pending.incoming.map((record) => {
                        const conflicts = libraryConflicts(pending.existing, record);
                        return (
                            <label key={record.id} className="library-backup-row">
                                <span>{record.name}</span>
                                <select
                                    aria-label={t("Import buildu: {0}", [record.name])}
                                    disabled={busy}
                                    value={
                                        Object.hasOwn(decisions, record.id)
                                            ? decisions[record.id]
                                            : conflicts.length
                                              ? "copy"
                                              : "add"
                                    }
                                    onChange={(event) =>
                                        setDecisions({
                                            ...decisions,
                                            [record.id]: event.target.value,
                                        })
                                    }
                                >
                                    <option value={conflicts.length ? "copy" : "add"}>
                                        {t(
                                            conflicts.length
                                                ? "Zachowaj oba (nowa kopia)"
                                                : "Dodaj build"
                                        )}
                                    </option>
                                    <option value="skip">{t("Pomiń")}</option>
                                    {conflicts.map((existing) => (
                                        <option key={existing.id} value={`replace:${existing.id}`}>
                                            {t("Zastąp: {0}", [existing.name])}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        );
                    })}
                    {preview.error ? (
                        <p role="alert">{t(preview.error)}</p>
                    ) : (
                        <p role="status">
                            {t(
                                "Dodane: {0}, zastąpione: {1}, pominięte: {2}. Po imporcie: {3}/10.",
                                [
                                    preview.plan.added,
                                    preview.plan.replaced,
                                    preview.plan.skipped,
                                    preview.plan.total,
                                ]
                            )}
                        </p>
                    )}
                    {preview.plan && !preview.plan.fits && (
                        <p role="alert">
                            {t(
                                "Po imporcie biblioteka przekroczyłaby limit 10 buildów. Pomiń wybrane wpisy lub zastąp istniejące."
                            )}
                        </p>
                    )}
                    <div className="library-backup-actions">
                        <button
                            type="button"
                            onClick={apply}
                            disabled={
                                busy ||
                                !preview.plan?.fits ||
                                preview.plan.added + preview.plan.replaced === 0
                            }
                        >
                            {t("Importuj wybrane buildy")}
                        </button>
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                                revision.current++;
                                setPending(null);
                            }}
                        >
                            {t("Anuluj import")}
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
}
