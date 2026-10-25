import { useTranslation } from "../../../shared/i18n/useTranslation";
import { nextItemThreshold, nextDrifThreshold } from "./upgradeThresholds";
import "./upgrade-hints.css";

export function ItemUpgradeHint({ item, stars }) {
    const { t } = useTranslation();
    const next = nextItemThreshold(item, stars);
    if (!next) return null;
    return (
        <details className="upgrade-hints">
            <summary>{t("Najbliższy próg gniazd i pojemności: {0}★", [t(next.stars)])}</summary>
            <ul>
                {next.sockets > next.socketsBefore && (
                    <li>
                        {t("Gniazda drifów: {0} → {1}", [t(next.socketsBefore), t(next.sockets)])}
                    </li>
                )}
                {next.capacity > next.capacityBefore && (
                    <li>{t("Pojemność: {0} → {1}", [t(next.capacityBefore), t(next.capacity)])}</li>
                )}
            </ul>
        </details>
    );
}

export function DrifUpgradeHint({ drif, level, basePower, usedPower, capacity }) {
    const { t } = useTranslation();
    const next = nextDrifThreshold(drif, level, basePower, usedPower, capacity);
    if (!next) return null;
    return (
        <details className="upgrade-hints">
            <summary>{t("Progi ulepszenia drifa")}</summary>
            <ul>
                {next.current >= next.maximum ? (
                    <li>{t("Maksymalny poziom tego rozmiaru: {0}.", [t(next.maximum)])}</li>
                ) : (
                    <>
                        {next.plateau && (
                            <li>{t("Kolejny próg poziomu: {0}.", [t(next.plateau)])}</li>
                        )}
                        {next.powerLevel && next.powerAfter != null && (
                            <>
                                <li>
                                    {t("Na poziomie {0} moc drifa rośnie: {1} → {2}.", [
                                        t(next.powerLevel),
                                        t(next.powerBefore),
                                        t(next.powerAfter),
                                    ])}
                                </li>
                                <li>
                                    {t("Łączna moc przedmiotu po tej zmianie: {0}/{1}.", [
                                        t(next.usedAfter),
                                        t(capacity),
                                    ])}
                                </li>
                                {next.missing > 0 && (
                                    <li>
                                        {t(
                                            "Brakuje {0} pojemności przy niezmienionych pozostałych drifach.",
                                            [t(next.missing)]
                                        )}
                                    </li>
                                )}
                            </>
                        )}
                    </>
                )}
            </ul>
        </details>
    );
}
