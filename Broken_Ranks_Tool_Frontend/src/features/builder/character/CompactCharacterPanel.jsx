import { useTranslation } from "../../../shared/i18n/useTranslation";
import { STAT_CONFIG } from "./characterConstants";

const CompactCharacterPanel = ({ development }) => {
    const { t } = useTranslation();
    return (
        <section className="character-summary" aria-label={t("Rozwój bohatera")}>
            <div className="character-level-control">
                <span>{t("Poziom")}</span>
                <div className="character-level-stepper">
                    <button
                        type="button"
                        onClick={() => development.changeLevel(development.level - 1)}
                        disabled={development.level <= 1}
                        aria-label={t("Zmniejsz poziom postaci")}
                    >
                        −
                    </button>
                    <input
                        type="number"
                        min="1"
                        max="140"
                        value={development.levelInput}
                        onChange={(event) => development.editLevel(event.target.value)}
                        onBlur={development.commitLevel}
                        onKeyDown={(event) => {
                            if (event.key === "Enter") {
                                event.preventDefault();
                                development.commitLevel();
                                event.currentTarget.blur();
                            }
                            if (event.key === "Escape") {
                                event.preventDefault();
                                development.cancelLevelEdit();
                            }
                        }}
                        aria-label={t("Poziom postaci")}
                    />
                    <button
                        type="button"
                        onClick={() => development.changeLevel(development.level + 1)}
                        disabled={development.level >= 140}
                        aria-label={t("Zwiększ poziom postaci")}
                    >
                        +
                    </button>
                </div>
            </div>
            <div
                className="character-stat-strip custom-scrollbar"
                tabIndex={0}
                aria-label={t("Statystyki postaci")}
            >
                {Object.keys(STAT_CONFIG).map((name) => (
                    <div className="character-stat-control" key={name} data-stat={name}>
                        <span className="character-stat-icon" aria-hidden="true" />
                        <div>
                            <span>{t(STAT_CONFIG[name].label || name)}</span>
                            <strong>{t(development.finalStats[name])}</strong>
                        </div>
                        <div className="character-stat-actions">
                            <button
                                type="button"
                                onClick={() => development.changePoints(name, -10)}
                                disabled={development.spentPoints[name] < 10}
                                aria-label={t("Odejmij 10 punktów: {0}", [t(name)])}
                            >
                                −10
                            </button>
                            <button
                                type="button"
                                onClick={() => development.changePoints(name, -1)}
                                disabled={development.spentPoints[name] <= 0}
                                aria-label={t("Odejmij punkt: {0}", [t(name)])}
                            >
                                −
                            </button>
                            <button
                                type="button"
                                onClick={() => development.changePoints(name, 1)}
                                disabled={development.pointsLeft <= 0}
                                aria-label={t("Dodaj punkt: {0}", [t(name)])}
                            >
                                +
                            </button>
                            <button
                                type="button"
                                onClick={() => development.changePoints(name, 10)}
                                disabled={development.pointsLeft < 10}
                                aria-label={t("Dodaj 10 punktów: {0}", [t(name)])}
                            >
                                +10
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            <div className="character-points-summary">
                <span>{t("Pozostało")}</span>
                <strong>{t(development.pointsLeft)}</strong>
                <small>
                    {t("z ")}
                    {t(development.totalPoints)}
                    {t(" pkt")}
                </small>
                <button type="button" className="character-reset" onClick={development.resetPoints}>
                    {t("Zresetuj punkty")}
                </button>
            </div>
        </section>
    );
};

export default CompactCharacterPanel;
