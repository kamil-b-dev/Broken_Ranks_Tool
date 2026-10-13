const formatDuration = (duration) => duration?.toFixed?.(2) ?? duration;
import OptimizationElapsedTime from "./OptimizationElapsedTime";

/** Presents progress and the latest outcome of an optimization run. */
const OptimizerStatusSection = ({
    isOptimizing,
    elapsedSeconds,
    startedAt,
    status,
    lastDurationSeconds,
}) => {
    const duration = status?.executionTimeSeconds ?? lastDurationSeconds;
    const advisor = status?.advisorReport;
    const advisorStatus = {
        OPTIMAL: "Optimum potwierdzone",
        BEST_FOUND: "Najlepszy znaleziony wynik",
        INFEASIBLE: "Brak planu w pełnym zakresie",
        CANCELLED: "Analiza anulowana",
    }[advisor?.status];
    const successful =
        (status?.outcome ? status.outcome === "VALID_BUILD" : status?.success) &&
        !["CANCELLED", "INFEASIBLE"].includes(advisor?.status);
    const search = status?.searchReport;
    const stopReason = {
        COMPLETED: advisor ? "Zakończono zakres" : "Zakończono heurystykę",
        OPERATION_LIMIT: "Limit operacji",
        TIME_LIMIT: "Limit czasu",
        STATE_LIMIT: "Limit liczby stanów",
        CANCELLED: "Anulowanie",
        INTERRUPTED: "Przerwano obliczenia",
    }[advisor?.stopReason ?? search?.stopReason];

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
                        {status.message}
                    </p>
                    {status.warnings?.length > 0 && (
                        <ul className="optimizer-status-warnings">
                            {status.warnings.map((warning, index) => (
                                <li key={`${warning}-${index}`}>{warning}</li>
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
                    {status.applied && !status.success && (
                        <p className="optimizer-status-applied">
                            {status.backpackDrifTargets
                                ? "Zastosowano układ z drifami z plecaka."
                                : "Zastosowano najlepszy znaleziony układ."}
                        </p>
                    )}
                    {status.applied === false && status.nextVariants?.length > 0 && (
                        <p className="optimizer-status-applied">
                            Wynik nie został zastosowany automatycznie. Procenty w raporcie dotyczą
                            proponowanego układu, a kalkulator liczy aktualny ekwipunek. Przycisk
                            „Zastosuj wybrany wariant” przenosi propozycję do kalkulatora.
                        </p>
                    )}
                    <dl className="optimizer-status-metrics">
                        {stopReason && (
                            <div>
                                <dd>{stopReason}</dd>
                                <dt>Zakończenie</dt>
                            </div>
                        )}
                        {!advisor && search && (
                            <>
                                <div>
                                    <dd>{search.evaluatedStates}</dd>
                                    <dt>Oceny stanów</dt>
                                </div>
                                <div>
                                    <dd>{search.verifiedStates}</dd>
                                    <dt>Przeliczenia kalkulatorem</dt>
                                </div>
                            </>
                        )}
                        {!advisor && status.configurationMode && (
                            <div>
                                <dd>
                                    {status.configurationMode === "SIMPLE"
                                        ? "Prosty"
                                        : "Zaawansowany"}
                                </dd>
                                <dt>Podtryb</dt>
                            </div>
                        )}
                        {advisorStatus && (
                            <div>
                                <dd>{advisorStatus}</dd>
                                <dt>Status Doradcy</dt>
                            </div>
                        )}
                        {advisor?.evaluatedStates !== undefined && (
                            <div>
                                <dd>{advisor.evaluatedStates}</dd>
                                <dt>Ocenione stany</dt>
                            </div>
                        )}
                        {advisor?.verifiedCandidates !== undefined && (
                            <div>
                                <dd>
                                    {advisor.verifiedCandidates}/{advisor.candidateCount}
                                </dd>
                                <dt>Zweryfikowani kandydaci</dt>
                            </div>
                        )}
                        {advisor?.maxActions !== undefined && (
                            <div>
                                <dd>{advisor.maxActions}</dd>
                                <dt>Limit działań</dt>
                            </div>
                        )}
                        {advisor && (
                            <div>
                                <dd>
                                    {advisor.proofComplete
                                        ? "pełny dowód"
                                        : advisor.searchSpaceExhausted
                                          ? "weryfikacja niepełna"
                                          : "zakres heurystyczny"}
                                </dd>
                                <dt>Zakres wyniku</dt>
                            </div>
                        )}
                        {status.drifsPlaced !== undefined && (
                            <div>
                                <dd>{status.drifsPlaced} drifów</dd>
                                <dt>Umieszczono</dt>
                            </div>
                        )}
                        {status.totalPowerUsed !== undefined && (
                            <div>
                                <dd>{status.totalPowerUsed}</dd>
                                <dt>Wykorzystana pojemność</dt>
                            </div>
                        )}
                        {duration !== null && duration !== undefined && (
                            <div>
                                <dd>{formatDuration(duration)} s</dd>
                                <dt>Czas</dt>
                            </div>
                        )}
                    </dl>
                </div>
            ) : null}
        </section>
    );
};

export default OptimizerStatusSection;
