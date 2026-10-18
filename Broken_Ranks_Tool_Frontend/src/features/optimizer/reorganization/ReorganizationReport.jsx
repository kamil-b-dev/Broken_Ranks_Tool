import { useTranslation } from "../../../shared/i18n/useTranslation";
import { useOptimizerLabelContext } from "../optimizerLabelContext";

export default function ReorganizationReport({ report, statChanges = [], translations = {} }) {
    const { t } = useTranslation();
    const { getName } = useOptimizerLabelContext();
    if (!report) return null;
    return (
        <section
            className="optimizer-report-section reorganization-report"
            aria-label={t("Wynik reorganizacji")}
        >
            <h5>{t("Rozmieszczenie kamieni")}</h5>
            {report.reservationSummary && (
                <p>
                    {t("{0}: wolne gniazda {1}, wolna pojemność {2}.", [
                        t(report.reservationSummary.label),
                        report.reservationSummary.freeSockets,
                        report.reservationSummary.freeCapacity,
                    ])}
                </p>
            )}
            {report.moves.length ? (
                <ul>
                    {report.moves.map((move, index) => (
                        <li key={index}>
                            {t(move.name)}: {t(move.from)} → {t(move.to)}
                        </li>
                    ))}
                </ul>
            ) : (
                <p>{t("Kamienie pozostają w dotychczasowych gniazdach.")}</p>
            )}
            {(report.upgrades || (report.upgrade ? [report.upgrade] : [])).map((upgrade, index) => (
                <p key={index}>
                    <strong>
                        {t(upgrade.maximizeLevel ? "Znaleziony poziom:" : "Po przełożeniu ulepsz:")}
                    </strong>{" "}
                    {t(upgrade.name)} {upgrade.before} → {t(upgrade.targetName)} {upgrade.after} lvl
                    · {t(upgrade.destination)}
                </p>
            ))}
            {report.capacities.length > 0 && (
                <>
                    <h5>{t("Wykorzystana pojemność")}</h5>
                    <ul>
                        {report.capacities.map((row) => (
                            <li key={row.slot}>
                                {t(row.slot)}: {row.before}/{row.capacity} → {row.after}/
                                {row.capacity}
                            </li>
                        ))}
                    </ul>
                </>
            )}
            {statChanges.length > 0 && (
                <>
                    <h5>{t("Zmiany statystyk")}</h5>
                    <ul>
                        {statChanges.map((change) => (
                            <li key={change.statKey}>
                                {t(
                                    getName(
                                        change.statKey,
                                        translations[change.statKey] || change.statKey
                                    )
                                )}
                                : {t(change.finalValue)} → {t(change.variantValue)}
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </section>
    );
}
