import { useContext, useState } from "react";
import {
    EquipmentBuildActionsContext,
    EquipmentStorageContext,
} from "../../shared/state/EquipmentContext";
import { downloadBuildPayload, downloadBuildText } from "../../features/builds/buildDownloads";
import { useTranslation } from "../../shared/i18n/useTranslation";
import DraftSaveWarning from "../../shared/ui/DraftSaveWarning";
import AppNotice from "../../shared/ui/AppNotice";
import "./workspace-actions.css";

export default function BuildStorageNotice({ library }) {
    const storage = useContext(EquipmentStorageContext);
    const actions = useContext(EquipmentBuildActionsContext);
    const [downloadError, setDownloadError] = useState(null);
    const { t } = useTranslation();
    const download = (action) => {
        try {
            action();
            setDownloadError(null);
        } catch {
            setDownloadError({
                type: "error",
                message: "Nie udało się pobrać kopii danych. Spróbuj ponownie.",
            });
        }
    };
    return (
        <>
            <DraftSaveWarning
                failed={storage?.saveFailed}
                message="Nie udało się automatycznie zapisać buildu. Zmiany są dostępne tylko w tej karcie. Ponów zapis lub pobierz kopię przed zamknięciem strony."
                onRetry={storage?.retrySave}
                onDownload={() =>
                    download(() => downloadBuildPayload(actions.createBuildSnapshot().payload))
                }
            />
            {storage?.draftRejected && (
                <div
                    className="build-file-notice build-file-notice-warning storage-warning"
                    role="status"
                >
                    <p>
                        {t(
                            storage.saveFailed
                                ? "Nie udało się odtworzyć poprzedniego szkicu. Automatyczny zapis jest wstrzymany do czasu zachowania kopii oryginalnych danych."
                                : "Nie udało się odtworzyć poprzedniego szkicu. Oryginalne dane zachowano do odzyskania."
                        )}
                    </p>
                    <div className="storage-warning-actions">
                        {storage.recoveryRaw != null && (
                            <button
                                type="button"
                                onClick={() =>
                                    download(() =>
                                        downloadBuildText(
                                            storage.recoveryRaw,
                                            "broken-ranks-draft-recovery.json"
                                        )
                                    )
                                }
                            >
                                {t("Pobierz oryginalny szkic")}
                            </button>
                        )}
                        <button type="button" onClick={storage.dismissRecovery}>
                            {t("Zamknij komunikat")}
                        </button>
                    </div>
                </div>
            )}
            {library?.storageWarning && (
                <div
                    className="build-file-notice build-file-notice-error storage-warning"
                    role="alert"
                >
                    <p>{t(library.storageWarning)}</p>
                    {library.canRecover && (
                        <div className="storage-warning-actions">
                            <button type="button" onClick={library.downloadRecovery}>
                                {t("Pobierz oryginalną bibliotekę")}
                            </button>
                            <button type="button" onClick={library.recover}>
                                {t("Zachowaj kopię i odzyskaj czytelne buildy")}
                            </button>
                        </div>
                    )}
                </div>
            )}
            <AppNotice notice={downloadError} onDismiss={() => setDownloadError(null)} />
        </>
    );
}
