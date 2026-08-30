/** Presents optimizer progress and the primary run action. */
const OptimizerRunAction = ({
    priorityCount,
    isOptimizing,
    elapsedSeconds,
    lastDurationSeconds,
    hasResult,
    onRun,
}) => (
    <div className="mt-4 pt-4 border-t border-stone-800/80">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="hidden sm:flex flex-wrap items-center gap-x-4 gap-y-1 flex-1 text-[10px] uppercase tracking-wide text-stone-500">
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
                className="optimizer-run-action w-full sm:w-auto sm:min-w-[320px] px-8 py-4 bg-gradient-to-b from-purple-900 to-black border border-purple-800 hover:from-purple-800 hover:to-black hover:border-purple-500 text-stone-200 font-serif font-bold text-sm uppercase tracking-[0.2em] transition-all shadow-[0_0_15px_rgba(128,0,128,0.3)] hover:shadow-[0_0_25px_rgba(160,32,240,0.5)] disabled:opacity-40 disabled:hover:from-purple-900 disabled:cursor-not-allowed flex items-center justify-center gap-3 rounded-sm"
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
