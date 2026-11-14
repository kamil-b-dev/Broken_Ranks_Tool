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

export default function AnalysisArchive({ document, busy, data, gameRules = {} }) {
    const { t } = useTranslation();
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
    return (
        <details className="analysis-archive">
            <summary>{t("Archiwum analiz")}</summary>
            <button
                type="button"
                disabled={busy || saving || !document?.status || !document?.input}
                onClick={() => perform(() => saveAnalysis(document))}
            >
                {t("Zapisz pełną analizę")}
            </button>
            {state.error && (
                <div role="alert">
                    {t(state.error)}
                    {state.damaged && (
                        <button
                            type="button"
                            disabled={saving}
                            onClick={() => perform(recoverAnalysisArchive)}
                        >
                            {t("Zachowaj kopię i odblokuj archiwum")}
                        </button>
                    )}
                    <button
                        type="button"
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
            )}
            <ul>
                {state.entries.map((record) => (
                    <li key={record.id}>
                        <button
                            type="button"
                            onClick={() => {
                                setSelected(record.id);
                                setVariant(0);
                            }}
                        >
                            {record.savedAt} · {t(record.document.status.mode || "Analiza")}
                        </button>
                        <button
                            type="button"
                            disabled={saving}
                            onClick={() => perform(() => removeAnalysis(record.id))}
                        >
                            {t("Usuń analizę")}
                        </button>
                        <button
                            type="button"
                            onClick={() =>
                                downloadBuildText(
                                    JSON.stringify(record, null, 2),
                                    "broken-ranks-analysis.json"
                                )
                            }
                        >
                            {t("Pobierz analizę")}
                        </button>
                    </li>
                ))}
            </ul>
            {entry && (
                <section>
                    <h3>{t("Zapisany wynik analizy")}</h3>
                    <details>
                        <summary>{t("Build wejściowy")}</summary>
                        {SLOTS.flatMap(({ key, label }) => {
                            const slot =
                                entry.document.input.payload?.build?.requestData?.slots?.[key];
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
                        active
                        status={{ ...status, applied: false }}
                        displayedVariant={status.nextVariants?.[variant]}
                        currentDetails={[]}
                        maxCaps={gameRules.maxCaps || {}}
                        translations={gameRules.bonusTranslations || {}}
                        activeVariantIndex={variant}
                        onSelectVariant={(_, index) => setVariant(index)}
                    />
                </section>
            )}
        </details>
    );
}
