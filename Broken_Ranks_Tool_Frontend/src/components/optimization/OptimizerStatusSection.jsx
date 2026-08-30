import React from "react";

const formatDuration = (duration) => duration?.toFixed?.(2) ?? duration;

/** Presents progress and the latest outcome of an optimization run. */
const OptimizerStatusSection = ({ isOptimizing, elapsedSeconds, status, lastDurationSeconds }) => {
    const duration = status?.executionTimeSeconds ?? lastDurationSeconds;

    return (
        <section className="bg-black/40 border border-stone-800 rounded-sm p-3">
            <h5 className="text-[10px] text-stone-400 uppercase tracking-widest font-semibold mb-2">
                Status
            </h5>
            {isOptimizing ? (
                <div className="flex items-center gap-2 text-xs text-purple-300">
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
                <div
                    className={`text-xs leading-relaxed ${status.success ? "text-emerald-300" : "text-amber-300"}`}
                >
                    <p>{status.message}</p>
                    {status.warnings?.length > 0 && (
                        <ul className="mt-2 space-y-1.5 border-l-2 border-amber-700/70 pl-2.5 text-amber-200">
                            {status.warnings.map((warning, index) => (
                                <li key={`${warning}-${index}`}>{warning}</li>
                            ))}
                        </ul>
                    )}
                    {status.applied && !status.success && (
                        <p className="mt-2 text-stone-400">
                            Zastosowano najlepszy znaleziony układ.
                        </p>
                    )}
                    <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] uppercase tracking-wide">
                        {status.drifsPlaced !== undefined && (
                            <>
                                <dt className="text-stone-500">Umieszczono</dt>
                                <dd className="text-right text-stone-200 tabular-nums">
                                    {status.drifsPlaced} drifów
                                </dd>
                            </>
                        )}
                        {duration !== null && duration !== undefined && (
                            <>
                                <dt className="text-stone-500">Czas</dt>
                                <dd className="text-right text-stone-200 tabular-nums">
                                    {formatDuration(duration)} s
                                </dd>
                            </>
                        )}
                    </dl>
                </div>
            ) : (
                <p className="text-xs text-stone-600 italic leading-relaxed">
                    Wynik i ostrzeżenia z kolejnej optymalizacji pojawią się tutaj.
                </p>
            )}
        </section>
    );
};

export default OptimizerStatusSection;
