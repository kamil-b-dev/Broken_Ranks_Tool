import { useTranslation } from "../i18n/useTranslation";

export default function DraftSaveWarning({ failed, onRetry, onDownload, message }) {
    const { t } = useTranslation();
    if (!failed) return null;
    return (
        <div className="build-file-notice build-file-notice-error storage-warning" role="alert">
            <p>{t(message)}</p>
            <div className="storage-warning-actions">
                <button type="button" onClick={onRetry}>
                    {t("Ponów zapis")}
                </button>
                <button type="button" onClick={onDownload}>
                    {t("Pobierz kopię do pliku")}
                </button>
            </div>
        </div>
    );
}
