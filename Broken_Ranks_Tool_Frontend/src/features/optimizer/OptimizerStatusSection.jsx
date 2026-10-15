import OptimizationElapsedTime from "./OptimizationElapsedTime";
import { useOptimizerLabelContext } from "./optimizerLabelContext";
const formatDuration = (duration) =>
    typeof duration === "number"
        ? duration.toLocaleString("pl-PL", { maximumFractionDigits: 2 })
        : duration;

/** Presents progress and the latest outcome of an optimization run. */
const OptimizerStatusSection = ({
    isOptimizing,
    elapsedSeconds,
    startedAt,
    status,
    lastDurationSeconds,
}) => {
    const { formatText } = useOptimizerLabelContext();
    const duration = status?.executionTimeSeconds ?? lastDurationSeconds;
    const advisor = status?.advisorReport;
    const successful =
        (status?.outcome ? status.outcome === "VALID_BUILD" : status?.success) &&
        !["CANCELLED", "INFEASIBLE"].includes(advisor?.status);
    const search = status?.searchReport;
    const headline =
        (advisor?.status === "INFEASIBLE" &&
            advisor.proofComplete &&
            "Przy wybranych ustawieniach nie da się osiągnąć celu.") ||
        (!advisor &&
            {
                VALID_BUILD: "Układ drifów jest gotowy.",
                VALID_BUILD_SOFT_TARGETS_UNMET:
                    "Układ jest gotowy. Nie wszystkie cele zostały osiągnięte.",
            }[status?.outcome]) ||
        status?.message;
    const stopMessage = {
        OPERATION_LIMIT: "Osiągnięto limit obliczeń.",
        TIME_LIMIT: "Upłynął czas przeznaczony na wyszukiwanie.",
        STATE_LIMIT: "Osiągnięto limit sprawdzanych układów.",
        CANCELLED: "Wyszukiwanie zostało anulowane.",
        INTERRUPTED: "Wyszukiwanie zostało przerwane.",
    }[
        advisor?.stopReason ??
            search?.stopReason ??
            (advisor?.status === "CANCELLED" ? "CANCELLED" : undefined)
    ];

    return (
        <section className="optimizer-report-section optimizer-status-section">
            {isOptimizing ? (
                <div className="optimizer-status-progress">
                    <svg
                        className="animate-spin h-4 w-4 shrink-0"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                    </svg>
                    <span>
                        Optymalizacja trwa (
                        <OptimizationElapsedTime
                            startedAt={startedAt}
                            elapsedSeconds={elapsedSeconds}
                        />{" "}
                        s).
                    </span>
                </div>
            ) : status ? (
                <div className={successful ? "is-success" : "is-warning"}>
                    <p className="optimizer-status-message">
                        <span aria-hidden="true">{successful ? "✓" : "!"}</span>
                        {formatText(headline)}
                    </p>
                    {status.warnings?.length > 0 && (
                        <ul className="optimizer-status-warnings">
                            {status.warnings.map((warning, index) => (
                                <li key={`${warning}-${index}`}>{formatText(warning)}</li>
                            ))}
                        </ul>
                    )}
                    {status.backpackDrifTargets?.length > 0 && (
                        <details className="optimizer-backpack-targets">
                            <summary>Drify z plecaka — poziomy docelowe</summary>
                            <table>
                                <thead>
                                    <tr>
                                        <th scope="col">Slot / drif</th>
                                        <th scope="col">Obecny</th>
                                        <th scope="col">Docelowy</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {status.backpackDrifTargets.map((drif) => (
                                        <tr key={drif.entryId}>
                                            <th scope="row">
                                                {drif.slotLabel}
                                                <br />
                                                {drif.drifName} {drif.size}
                                            </th>
                                            <td>{drif.level}</td>
                                            <td>{drif.targetLevel}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </details>
                    )}
                    {status.applied && (
                        <p className="optimizer-status-applied">
                            {status.backpackDrifTargets
                                ? "Drify z plecaka zostały założone."
                                : "Ten układ jest obecnie założony."}
                        </p>
                    )}
                    {status.applied === false && (
                        <p className="optimizer-status-applied">
                            {!status.nextVariants?.length
                                ? "Ekwipunek nie został zmieniony."
                                : status.mode === "REORGANIZE" ||
                                    Array.isArray(status.backpackDrifUsages)
                                  ? "Wynik nie został zastosowany. Uruchom optymalizację ponownie."
                                  : "Ekwipunek pozostaje bez zmian. Aby użyć propozycji, kliknij „Zastosuj wybrany wariant”."}
                        </p>
                    )}
                    <dl className="optimizer-status-metrics optimizer-result-metrics">
                        {advisor && status.nextVariants && (
                            <div>
                                <dd>{status.nextVariants.length}</dd>
                                <dt>Propozycje zmian</dt>
                            </div>
                        )}
                        {!advisor &&
                            status.drifsPlaced !== undefined &&
                            (status.applied ||
                                status.success ||
                                ["VALID_BUILD", "VALID_BUILD_SOFT_TARGETS_UNMET"].includes(
                                    status.outcome
                                )) && (
                                <div>
                                    <dd>{status.drifsPlaced}</dd>
                                    <dt>Drify w układzie</dt>
                                </div>
                            )}
                        {duration !== null && duration !== undefined && (
                            <div>
                                <dd>{formatDuration(duration)} s</dd>
                                <dt>Czas obliczeń</dt>
                            </div>
                        )}
                    </dl>
                    {(search || advisor || status.totalPowerUsed !== undefined) && (
                        <details className="optimizer-status-details">
                            <summary>Szczegóły obliczeń</summary>
                            {(search || advisor) && (
                                <p className="optimizer-status-scope">
                                    {stopMessage && `${stopMessage} `}
                                    {(advisor ?? search).proofComplete
                                        ? "Sprawdzono wszystkie możliwości w wybranym zakresie."
                                        : "Lepszy układ może jeszcze istnieć."}
                                </p>
                            )}
                            {status.totalPowerUsed !== undefined && (
                                <p className="optimizer-status-scope">
                                    Zajęta pojemność: <strong>{status.totalPowerUsed}</strong>.
                                </p>
                            )}
                        </details>
                    )}
                </div>
            ) : null}
        </section>
    );
};

export default OptimizerStatusSection;
