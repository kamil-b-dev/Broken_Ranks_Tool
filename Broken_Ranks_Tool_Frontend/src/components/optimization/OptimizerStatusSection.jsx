import React from "react";

const formatDuration = (duration) => duration?.toFixed?.(2) ?? duration;

/** Presents progress and the latest outcome of an optimization run. */
const OptimizerStatusSection = ({ isOptimizing, elapsedSeconds, status, lastDurationSeconds }) => {
    const duration = status?.executionTimeSeconds ?? lastDurationSeconds;

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
                    <span>Optymalizacja trwa ({elapsedSeconds} s).</span>
                </div>
            ) : status ? (
                <div className={status.success ? "is-success" : "is-warning"}>
                    <p className="optimizer-status-message">
                        <span aria-hidden="true">{status.success ? "✓" : "!"}</span>
                        {status.message}
                    </p>
                    {status.warnings?.length > 0 && (
                        <ul className="optimizer-status-warnings">
                            {status.warnings.map((warning, index) => (
                                <li key={`${warning}-${index}`}>{warning}</li>
                            ))}
                        </ul>
                    )}
                    {status.applied && !status.success && (
                        <p className="optimizer-status-applied">
                            Zastosowano najlepszy znaleziony układ.
                        </p>
                    )}
                    <dl className="optimizer-status-metrics">
                        {status.drifsPlaced !== undefined && (
                            <div>
                                <dd>{status.drifsPlaced} drifów</dd>
                                <dt>Umieszczono</dt>
                            </div>
                        )}
                        {status.totalPowerUsed !== undefined && (
                            <div>
                                <dd>{status.totalPowerUsed}</dd>
                                <dt>Wykorzystana moc</dt>
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
            ) : (
                <div className="optimizer-status-empty">
                    <span aria-hidden="true">✦</span>
                    <p>Wynik i ostrzeżenia z kolejnej optymalizacji pojawią się tutaj.</p>
                </div>
            )}
        </section>
    );
};

export default OptimizerStatusSection;
