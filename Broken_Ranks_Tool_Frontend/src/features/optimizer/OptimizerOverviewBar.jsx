import { useTranslation } from "../../shared/i18n/useTranslation";
import { SLOTS } from "../../shared/domain/equipment/equipmentSlots";

const countConfigured = (values) => (values || []).filter(Boolean).length;

/** Summarizes the actual build state used as optimizer input. */
const OptimizerOverviewBar = ({
    slots = {},
    lockedSlots = [],
    lockedDrifs = {},
    onBackToBuilder,
}) => {
    const { t } = useTranslation();

    const equippedCount = SLOTS.filter((slot) => slots[slot.key]?.itemId).length;
    const drifCount = Object.values(slots).reduce(
        (total, slot) => total + countConfigured(slot?.drifIds),
        0
    );
    const lockedDrifCount = Object.values(lockedDrifs).reduce(
        (total, indexes) => total + (indexes?.length || 0),
        0
    );

    return (
        <section
            className="optimizer-overview"
            aria-label={t("Konfiguracja źródłowa optymalizatora")}
        >
            <div className="optimizer-overview-title">
                <strong>{t("Aktualny build")}</strong>
            </div>
            <dl>
                <div>
                    <dt>{t("Ekwipunek")}</dt>
                    <dd>
                        {t(equippedCount)}/{t(SLOTS.length)}
                    </dd>
                </div>
                <div>
                    <dt>{t("Drify")}</dt>
                    <dd>{t(drifCount)}</dd>
                </div>
                <div className="optimizer-overview-locks">
                    <dt>{t("Zablokowane")}</dt>
                    <dd>
                        {t(lockedSlots.length)} <small>{t("sloty")}</small>
                        <span>·</span>
                        {t(lockedDrifCount)} <small>{t("drifów")}</small>
                    </dd>
                </div>
            </dl>
            {onBackToBuilder && (
                <button type="button" className="optimizer-back-action" onClick={onBackToBuilder}>
                    <span aria-hidden="true">←</span>
                    {t("Wróć do kreatora")}
                </button>
            )}
        </section>
    );
};

export default OptimizerOverviewBar;
