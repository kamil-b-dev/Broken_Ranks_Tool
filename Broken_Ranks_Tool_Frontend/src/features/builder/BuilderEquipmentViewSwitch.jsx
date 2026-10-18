import { useTranslation } from "../../shared/i18n/useTranslation";
export default function BuilderEquipmentViewSwitch({ view, onChange }) {
    const { t } = useTranslation();

    return (
        <div
            className="builder-equipment-view-switch"
            role="group"
            aria-label={t("Widok ekwipunku")}
        >
            {[
                ["character", "Postać"],
                ["backpack", "Plecak"],
            ].map(([key, label]) => (
                <button
                    key={key}
                    type="button"
                    aria-pressed={view === key}
                    onClick={() => onChange(key)}
                >
                    {t(label)}
                </button>
            ))}
        </div>
    );
}
