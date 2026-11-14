import { useState } from "react";
import { useTranslation } from "../../../shared/i18n/useTranslation";
import { calculateEquipmentStats } from "../../../shared/api/equipmentApi";
import { parseBuildPayload } from "../buildFile";
import { createBuildShareLink } from "../sharing/buildShare";
import { downloadBuildCard } from "../sharing/buildCard";
import { findMissingResources } from "../planning/buildResources";
import { SLOTS } from "../../../shared/domain/equipment/equipmentSlots";

export default function BuildRecordTools({ record, data, library }) {
    const { t } = useTranslation();
    const [notes, setNotes] = useState(record.notes || "");
    const [tags, setTags] = useState((record.tags || []).join(", "));
    const [version, setVersion] = useState("0");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [link, setLink] = useState("");
    const [resources, setResources] = useState(null);
    const run = async (action) => {
        setError("");
        setBusy(true);
        try {
            await action();
        } catch (failure) {
            setError(failure.response?.data?.message || failure.message);
        } finally {
            setBusy(false);
        }
    };
    return (
        <details className="build-record-tools">
            <summary>{t("Opis, wersje i narzędzia")}</summary>
            <label>
                {t("Notatka")}
                <textarea
                    value={notes}
                    maxLength={2000}
                    onChange={(event) => setNotes(event.target.value)}
                />
            </label>
            <label>
                {t("Oznaczenia (oddziel przecinkiem)")}
                <input
                    value={tags}
                    maxLength={330}
                    onChange={(event) => setTags(event.target.value)}
                />
            </label>
            <button
                type="button"
                disabled={!library?.updateMetadata || busy}
                onClick={() =>
                    run(() =>
                        library.updateMetadata(record.id, {
                            notes,
                            tags: tags
                                .split(",")
                                .map((tag) => tag.trim())
                                .filter(Boolean),
                        })
                    )
                }
            >
                {t("Zapisz opis")}
            </button>
            {!!record.revisions?.length && (
                <div className="build-tools-row">
                    <label>
                        {t("Wersja buildu")}
                        <select
                            value={version}
                            onChange={(event) => setVersion(event.target.value)}
                        >
                            {record.revisions.map((entry, index) => (
                                <option
                                    key={index}
                                    value={index}
                                >{`${index + 1} · ${entry.updatedAt}`}</option>
                            ))}
                        </select>
                    </label>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                            run(() => {
                                parseBuildPayload(record.revisions[Number(version)].payload, data);
                                return library.restoreVersion(record.id, Number(version));
                            })
                        }
                    >
                        {t("Przywróć wersję")}
                    </button>
                </div>
            )}
            <div className="build-tools-row">
                <button
                    type="button"
                    disabled={busy || !library?.updateCalculation}
                    onClick={() =>
                        run(async () => {
                            const parsed = parseBuildPayload(record.payload, data);
                            const response = await calculateEquipmentStats(parsed.requestData);
                            await library.updateCalculation(
                                record.id,
                                JSON.stringify(record.payload),
                                response
                            );
                        })
                    }
                >
                    {t("Przelicz statystyki")}
                </button>
                <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                        run(async () => {
                            const parsed = parseBuildPayload(record.payload, data);
                            const response = await calculateEquipmentStats(parsed.requestData);
                            setLink(
                                createBuildShareLink({
                                    ...record,
                                    stats: response.stats || response,
                                })
                            );
                        })
                    }
                >
                    {t("Udostępnij link")}
                </button>
                <button
                    type="button"
                    disabled={busy}
                    onClick={() => run(() => downloadBuildCard(record, data, t))}
                >
                    {t("Pobierz PNG")}
                </button>
                <button
                    type="button"
                    disabled={busy || !library?.createSnapshot}
                    onClick={() =>
                        run(() => {
                            const current = library.createSnapshot().payload.build;
                            setResources(
                                findMissingResources(
                                    current.requestData,
                                    current.backpack,
                                    record.payload.build.requestData,
                                    data
                                )
                            );
                        })
                    }
                >
                    {t("Sprawdź braki do tego buildu")}
                </button>
            </div>
            {link && (
                <label>
                    {t("Link do podglądu")}
                    <textarea readOnly value={link} onFocus={(event) => event.target.select()} />
                </label>
            )}
            {resources && (
                <div className="build-resource-list">
                    <strong>{t("Braki i ulepszenia do celu")}</strong>
                    {resources
                        .filter((row) => row.status !== "owned")
                        .map((row, index) => (
                            <p key={index}>
                                {row.name} ·{" "}
                                {t(SLOTS.find((slot) => slot.key === row.slot)?.label || row.slot)}{" "}
                                ·{" "}
                                {row.status === "missing"
                                    ? t("Do zdobycia")
                                    : row.status === "configure"
                                      ? t("Do skonfigurowania")
                                      : t("Do ulepszenia")}{" "}
                                · {row.fromLevel != null ? `${row.fromLevel} → ` : ""}
                                {row.level}
                                {row.kind === "item" ? "★" : ""}
                            </p>
                        ))}
                    {resources.every((row) => row.status === "owned") && (
                        <p>{t("Masz wszystkie potrzebne rzeczy.")}</p>
                    )}
                </div>
            )}
            {error && <p role="alert">{t(error)}</p>}
        </details>
    );
}
