import { useTranslation } from "../../../shared/i18n/useTranslation";

export default function StatValue({ value, capLabel, className = "" }) {
    const { t } = useTranslation();
    return (
        <strong className={`stat-value ${className}`}>
            {t(value)} {capLabel && <small className="stat-cap">{capLabel}</small>}
        </strong>
    );
}
