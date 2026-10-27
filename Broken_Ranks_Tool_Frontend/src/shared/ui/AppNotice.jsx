import { useTranslation } from "../i18n/useTranslation";
/** Accessible inline feedback shared by application workflows. */
const AppNotice = ({ notice, onDismiss }) => {
    const { t } = useTranslation();
    return (
        notice && (
            <div
                className={`build-file-notice build-file-notice-${notice.type}`}
                role={notice.type === "error" ? "alert" : "status"}
                aria-live={notice.type === "error" ? "assertive" : "polite"}
            >
                <span aria-hidden="true">{t(notice.type === "success" ? "✓" : "!")}</span>
                <p>
                    {[notice.message, ...(notice.details || [])]
                        .map((message) => t(message))
                        .join(" ")}
                </p>
                {onDismiss ? (
                    <button type="button" onClick={onDismiss} aria-label={t("Zamknij komunikat")}>
                        ×
                    </button>
                ) : null}
            </div>
        )
    );
};

export default AppNotice;
