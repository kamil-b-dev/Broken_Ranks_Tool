import { useTranslation } from "../../../shared/i18n/useTranslation";
import { useEquipmentSetup } from "../../../shared/state/EquipmentContext";
import { useCharacterDevelopment } from "../character/useCharacterDevelopment";
import { STAT_CONFIG } from "../character/characterConstants";

export default function MobileCharacterPanel() {
    const { t } = useTranslation();

    const equipment = useEquipmentSetup();
    const model = useCharacterDevelopment({
        onStatsChange: equipment.handleCharacterStatsUpdate,
        externalConfig: equipment.characterConfig,
        externalStats: equipment.requestData.characterStats,
        syncTrigger: equipment.optimizationTrigger,
    });
    return (
        <section className="mobile-card" aria-label={t("Rozwój postaci")}>
            <label className="mobile-field">
                {t("Poziom postaci")}
                <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={140}
                    value={model.levelInput}
                    onChange={(event) => model.editLevel(event.target.value)}
                    onBlur={model.commitLevel}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            event.preventDefault();
                            model.commitLevel();
                            event.currentTarget.blur();
                        }
                        if (event.key === "Escape") {
                            event.preventDefault();
                            model.cancelLevelEdit();
                        }
                    }}
                />
            </label>
            <p className="mobile-points">
                {t("Dostępne punkty")}
                {t(" ")}
                <strong>
                    {t(model.pointsLeft)} / {t(model.totalPoints)}
                </strong>
            </p>
            {Object.keys(STAT_CONFIG).map((name) => (
                <div key={name} className="mobile-character-stat">
                    <span>
                        {t(STAT_CONFIG[name].label || name)}
                        <strong>{t(model.finalStats[name])}</strong>
                        <small>
                            {t(model.spentPoints[name])}
                            {t(" pkt")}
                        </small>
                    </span>
                    <button
                        type="button"
                        aria-label={t("Odejmij punkt: {0}", [t(name)])}
                        disabled={model.spentPoints[name] <= 0}
                        onClick={() => model.changePoints(name, -1)}
                    >
                        −
                    </button>
                    <button
                        type="button"
                        aria-label={t("Dodaj punkt: {0}", [t(name)])}
                        disabled={model.pointsLeft <= 0}
                        onClick={() => model.changePoints(name, 1)}
                    >
                        +
                    </button>
                </div>
            ))}
            <button type="button" className="mobile-back" onClick={model.resetPoints}>
                {t("Zresetuj punkty")}
            </button>
        </section>
    );
}
