import { useTranslation } from "../../../shared/i18n/useTranslation";
import { useOptimizerLabelContext } from "../optimizerLabelContext";
import { SLOTS } from "../../../shared/domain/equipment/equipmentSlots";

export default function ReorganizationReport({ report, statChanges = [], translations = {} }) {
    const { t } = useTranslation();
    const { getName } = useOptimizerLabelContext();
    if (!report) return null;
    const location = (value) => {
        if (!value) return t("Plecak");
        const [slot, index] = value.split(":");
        return `${t(SLOTS.find((entry) => entry.key === slot)?.label || slot)}${report.itemNames?.[slot] ? ` · ${report.itemNames[slot]}` : ""}, ${t("gniazdo {0}", [Number(index) + 1])}`;
    };
    const operations = report.sequence?.operations || [];
    return (
        <section
            className="optimizer-report-section reorganization-report"
            aria-label={t("Wynik reorganizacji")}
        >
            <h5>{t(operations.length ? "Instrukcja wykonania" : "Rozmieszczenie kamieni")}</h5>
            {report.sequence?.extraSlotsNeeded > 0 && (
                <p className="reorganization-preflight" role="status">
                    {t(
                        "Przed wykonaniem tej instrukcji zwolnij dodatkowo {0} miejsc w plecaku na tymczasowo wyjmowane kamienie.",
                        [report.sequence.extraSlotsNeeded]
                    )}
                </p>
            )}
            {report.sequence?.unavailable && (
                <p>
                    {t(
                        "Nie udało się potwierdzić kolejności wykonania. Poniżej podano wyłącznie rozmieszczenie docelowe."
                    )}
                </p>
            )}
            {report.reservationSummary && (
                <p>
                    {t("{0}: wolne gniazda {1}, wolna pojemność {2}.", [
                        t(report.reservationSummary.label),
                        report.reservationSummary.freeSockets,
                        report.reservationSummary.freeCapacity,
                    ])}
                </p>
            )}
            {operations.length ? (
                <ol className="reorganization-operations">
                    {operations.map((operation, index) => (
                        <li key={index}>
                            {operation.kind === "UPGRADE" ? (
                                <>
                                    <strong>
                                        {t(
                                            operations
                                                .slice(0, index)
                                                .some((previous) => previous.kind !== "UPGRADE")
                                                ? "Po przełożeniu ulepsz:"
                                                : "Ulepsz:"
                                        )}
                                    </strong>{" "}
                                    {t("{0} {1} lvl → {2} {3} lvl · {4}", [
                                        t(operation.name),
                                        operation.level,
                                        t(operation.targetName),
                                        operation.targetLevel,
                                        location(operation.to),
                                    ])}
                                </>
                            ) : operation.kind === "REMOVE" ? (
                                t(
                                    operation.temporary
                                        ? "Wyjmij tymczasowo {0} ({1}, {2} lvl) z: {3} do plecaka."
                                        : "Odłóż {0} ({1}, {2} lvl) z: {3} do plecaka.",
                                    [
                                        t(operation.name),
                                        t(operation.size),
                                        operation.level,
                                        location(operation.from),
                                    ]
                                )
                            ) : (
                                t("Przenieś {0} ({1}, {2} lvl): {3} → {4}.", [
                                    t(operation.name),
                                    t(operation.size),
                                    operation.level,
                                    location(operation.from),
                                    location(operation.to),
                                ])
                            )}
                        </li>
                    ))}
                </ol>
            ) : report.moves.length ? (
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
            {!operations.length &&
                (report.upgrades || (report.upgrade ? [report.upgrade] : [])).map(
                    (upgrade, index) => (
                        <p key={index}>
                            <strong>
                                {t(
                                    upgrade.maximizeLevel
                                        ? "Znaleziony poziom:"
                                        : "Po przełożeniu ulepsz:"
                                )}
                            </strong>{" "}
                            {t(upgrade.name)} {upgrade.before} → {t(upgrade.targetName)}{" "}
                            {upgrade.after} lvl · {t(upgrade.destination)}
                        </p>
                    )
                )}
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
