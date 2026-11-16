import { useState } from "react";
import {
    readAnalysisArchive,
    saveAnalysis,
    removeAnalysis,
    recoverAnalysisArchive,
    ANALYSIS_ARCHIVE_KEY,
} from "./analysisArchiveStorage";
import OptimizerReportColumn from "../OptimizerReportColumn";
import { downloadBuildText } from "../../builds/buildDownloads";
import { SLOTS } from "../../../shared/domain/equipment/equipmentSlots";
import { useTranslation } from "../../../shared/i18n/useTranslation";
import "./analysis-archive.css";

const modeLabels = {
    ADVISOR: "Doradca",
    REORGANIZE: "Reorganizacja",
    BUILD_FROM_SCRATCH: "Optymalizator",
};

export default function AnalysisArchive({ document, busy, data, gameRules = {} }) {
    const { t, locale } = useTranslation();
    const [state, setState] = useState(() => {
        try {
            return { entries: readAnalysisArchive() };
        } catch (error) {
            return { entries: [], error: error.message, damaged: true };
        }
    });
    const [selected, setSelected] = useState(null);
    const [variant, setVariant] = useState(0);
    const [saving, setSaving] = useState(false);
    const perform = async (operation) => {
        setSaving(true);
        try {
            setState({ entries: await operation() });
        } catch (error) {
            setState((previous) => ({ ...previous, error: error.message }));
        } finally {
            setSaving(false);
        }
    };
    const entry = state.entries.find((value) => value.id === selected);
    const status = entry?.document.status;
    const formatDate = (value) => {
        const date = new Date(value);
        return Number.isNaN(date.getTime())
            ? value
            : new Intl.DateTimeFormat(locale, {
                  dateStyle: "medium",
                  timeStyle: "short",
              }).format(date);
    };
    return (
        <div className="analysis-archive" role="region" aria-label={t("Archiwum analiz")}>
            <div className="analysis-archive-body">
                <div className="analysis-archive-toolbar">
                    <button
                        type="button"
                        className="analysis-archive-action analysis-archive-save"
                        disabled={busy || saving || !document?.status || !document?.input}
                        onClick={() => perform(() => saveAnalysis(document))}
                    >
                        {t("Zapisz pełną analizę")}
                    </button>
                    {!state.damaged && (
                        <span className="analysis-archive-count">{state.entries.length} / 10</span>
                    )}
                </div>
                {state.error && (
                    <div className="analysis-archive-error" role="alert">
                        <p>{t(state.error)}</p>
                        <div className="analysis-archive-actions">
                            {state.damaged && (
                                <button
                                    type="button"
                                    className="analysis-archive-action"
                                    disabled={saving}
                                    onClick={() => perform(recoverAnalysisArchive)}
                                >
                                    {t("Zachowaj kopię i odblokuj archiwum")}
                                </button>
                            )}
                            <button
                                type="button"
                                className="analysis-archive-action"
                                onClick={() =>
                                    downloadBuildText(
                                        localStorage.getItem(ANALYSIS_ARCHIVE_KEY) || "",
                                        "analysis-recovery.json"
                                    )
                                }
                            >
                                {t("Pobierz kopię archiwum")}
                            </button>
                        </div>
                    </div>
                )}
                <div className={`analysis-archive-layout ${entry ? "has-preview" : ""}`}>
                    <ul className="analysis-archive-list">
                        {state.entries.map((record) => (
                            <li className="analysis-archive-record" key={record.id}>
                                <button
                                    type="button"
                                    className="analysis-archive-select"
                                    aria-pressed={record.id === selected}
                                    onClick={() => {
                                        setSelected(record.id);
                                        setVariant(0);
                                    }}
                                >
                                    <strong>
                                        {t(modeLabels[record.document.status.mode] || "Analiza")}
                                    </strong>
                                    <time dateTime={record.savedAt}>
                                        {formatDate(record.savedAt)}
                                    </time>
                                </button>
                                <div className="analysis-archive-actions">
                                    <button
                                        type="button"
                                        className="analysis-archive-action"
                                        onClick={() =>
                                            downloadBuildText(
                                                JSON.stringify(record, null, 2),
                                                "broken-ranks-analysis.json"
                                            )
                                        }
                                    >
                                        {t("Pobierz analizę")}
                                    </button>
                                    <button
                                        type="button"
                                        className="analysis-archive-action analysis-archive-delete"
                                        disabled={saving}
                                        onClick={() => perform(() => removeAnalysis(record.id))}
                                    >
                                        {t("Usuń analizę")}
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                    {!state.entries.length && !state.damaged && (
                        <p className="analysis-archive-empty">{t("Brak zapisanych analiz.")}</p>
                    )}
                    {entry && (
                        <section className="analysis-archive-preview">
                            <h3>{t("Zapisany wynik analizy")}</h3>
                            <details className="analysis-archive-input">
                                <summary>{t("Build wejściowy")}</summary>
                                {SLOTS.flatMap(({ key, label }) => {
                                    const slot =
                                        entry.document.input.payload?.build?.requestData?.slots?.[
                                            key
                                        ];
                                    const item = data?.items?.find(
                                        (candidate) => String(candidate.id) === String(slot?.itemId)
                                    );
                                    return item
                                        ? [
                                              <p key={key}>
                                                  {t(label)}: {item.name} · {slot.itemStars ?? 1}★
                                              </p>,
                                          ]
                                        : [];
                                })}
                            </details>
                            <OptimizerReportColumn
                                embedded
                                advisory={status.mode === "ADVISOR"}
                                status={{ ...status, applied: false }}
                                displayedVariant={status.nextVariants?.[variant]}
                                currentDetails={[]}
                                maxCaps={gameRules.drifMaxCaps || {}}
                                translations={gameRules.bonusTranslations || {}}
                                activeVariantIndex={variant}
                                onSelectVariant={(_, index) => setVariant(index)}
                            />
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
}
