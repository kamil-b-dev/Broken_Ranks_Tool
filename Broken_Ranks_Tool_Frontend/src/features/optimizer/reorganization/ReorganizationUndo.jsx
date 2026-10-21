import { useTranslation } from "../../../shared/i18n/useTranslation";

export default function ReorganizationUndo({ available, warning, disabled, onUndo }) {
    const { t } = useTranslation();
    if (!available) return null;
    return (
        <section className="optimizer-report-section reorganization-undo">
            <button
                type="button"
                className="optimizer-apply-variant"
                disabled={disabled || Boolean(warning)}
                onClick={onUndo}
            >
                {t("Cofnij reorganizację")}
            </button>
            {warning && <p role="status">{t(warning)}</p>}
        </section>
    );
}
