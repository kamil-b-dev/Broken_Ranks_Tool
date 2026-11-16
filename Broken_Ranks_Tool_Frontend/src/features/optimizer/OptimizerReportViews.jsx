import { useId, useState } from "react";
import { useTranslation } from "../../shared/i18n/useTranslation";

/** Keeps the current report and saved analyses in the same result area. */
export default function OptimizerReportViews({ archive, children }) {
    const { t } = useTranslation();
    const [view, setView] = useState("report");
    const id = useId();

    return (
        <div className="optimizer-report-views">
            <div
                className="optimizer-report-view-switch"
                role="group"
                aria-label={t("Widok raportu")}
            >
                {[
                    ["report", "Raport"],
                    ["archive", "Archiwum analiz"],
                ].map(([key, label]) => (
                    <button
                        key={key}
                        type="button"
                        aria-pressed={view === key}
                        aria-controls={`${id}-${key}`}
                        onClick={() => setView(key)}
                    >
                        {t(label)}
                    </button>
                ))}
            </div>
            <div
                id={`${id}-report`}
                className="optimizer-report-view custom-scrollbar"
                hidden={view !== "report"}
            >
                {children}
            </div>
            <div
                id={`${id}-archive`}
                className="optimizer-report-view custom-scrollbar"
                hidden={view !== "archive"}
            >
                {archive}
            </div>
        </div>
    );
}
