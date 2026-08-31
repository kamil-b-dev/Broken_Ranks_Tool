/** Presents optimizer progress and the primary run action. */
const OptimizerRunAction = ({
    priorityCount,
    isOptimizing,
    elapsedSeconds,
    lastDurationSeconds,
    hasResult,
    onRun,
}) => (
    <div className="optimizer-run-panel">
        <div className="optimizer-run-inner">
            <div className="optimizer-run-meta">
                <span>
                    <strong className="text-stone-300">{priorityCount}</strong> priorytetów
                </span>
                {lastDurationSeconds !== null && (
                    <span>
                        Ostatnio:{" "}
                        <strong className="text-stone-300">{lastDurationSeconds} s</strong>
                    </span>
                )}
            </div>
            <button
                onClick={onRun}
                disabled={priorityCount === 0 || isOptimizing}
                className="optimizer-run-action"
            >
                {isOptimizing ? (
                    <>
                        <svg
                            className="animate-spin h-5 w-5 text-purple-400"
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
                        KALKULACJA W TLE...
                        <span className="text-purple-300 tabular-nums">({elapsedSeconds} s)</span>
                    </>
                ) : hasResult ? (
                    "OPTYMALIZUJ PONOWNIE"
                ) : (
                    "URUCHOM OPTYMALIZACJĘ"
                )}
            </button>
        </div>
    </div>
);

export default OptimizerRunAction;
