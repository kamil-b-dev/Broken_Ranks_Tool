import React from "react";
import { formatPotentialValue } from "./optimizerDomain";

const Checkmark = () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
        <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
        />
    </svg>
);

/** Controls the optimization targets for one prioritized modifier. */
const OptimizerPriorityForm = ({ bonus, potential, maxCap, onChange }) => {
    const hasCap = maxCap !== null && maxCap !== undefined;
    const toggleClass = (active, color = "purple") =>
        `w-5 h-5 flex items-center justify-center border rounded-sm transition-all ${
            active
                ? color === "amber"
                    ? "bg-amber-900 border-amber-500 text-amber-100 shadow-[0_0_8px_rgba(245,158,11,0.4)]"
                    : "bg-purple-900 border-purple-500 text-stone-200 shadow-[0_0_8px_rgba(168,85,247,0.5)]"
                : color === "amber"
                  ? "bg-stone-950 border-stone-700 text-transparent hover:border-amber-800"
                  : "bg-stone-950 border-stone-700 text-transparent hover:border-purple-800"
        }`;

    return (
        <div className="flex flex-col gap-3 p-2 relative z-10">
            {potential && (
                <div className="flex flex-wrap items-center justify-between gap-2 border border-sky-950/80 bg-sky-950/20 px-2 py-1.5">
                    <div className="text-[9px] uppercase tracking-wider text-sky-500">
                        Potencjalny zakres
                    </div>
                    <span className="shrink-0 text-xs font-bold text-sky-300 tabular-nums">
                        {formatPotentialValue(potential.potentialMinimum)}–
                        {formatPotentialValue(potential.potentialMaximum)}
                    </span>
                </div>
            )}
            <div className="flex flex-col gap-1">
                <div className="flex justify-between items-end">
                    <span className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">
                        Waga Priorytetu
                    </span>
                    <span className="text-xs text-purple-400 font-bold">
                        {bonus.weight}{" "}
                        <span className="text-stone-600 text-[9px] font-normal">/ 30</span>
                    </span>
                </div>
                <input
                    type="range"
                    min="1"
                    max="30"
                    value={bonus.weight}
                    onChange={(event) => onChange("weight", event.target.value)}
                    className="w-full h-1 bg-stone-950 border border-stone-800 rounded-sm appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-purple-900 [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-purple-400 [&::-webkit-slider-thumb]:rounded-sm [&::-webkit-slider-thumb]:shadow-[0_0_5px_rgba(168,85,247,0.7)] hover:[&::-webkit-slider-thumb]:bg-purple-700 hover:[&::-webkit-slider-thumb]:border-purple-300 transition-all [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-purple-900 [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-purple-400 [&::-moz-range-thumb]:rounded-sm [&::-moz-range-thumb]:shadow-[0_0_5px_rgba(168,85,247,0.7)] hover:[&::-moz-range-thumb]:bg-purple-700 hover:[&::-moz-range-thumb]:border-purple-300"
                />
            </div>
            <div className="flex flex-col gap-2 bg-black/30 p-2 rounded-sm border border-stone-800/50">
                <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] text-stone-500 uppercase tracking-wider whitespace-nowrap">
                        Limit Ilości:
                    </span>
                    <div className="flex items-center gap-2">
                        {["min", "max"].map((field, index) => (
                            <React.Fragment key={field}>
                                {index > 0 && <span className="text-stone-700">-</span>}
                                <div className="flex items-center gap-1.5 bg-stone-950 border border-stone-700 rounded-sm px-1.5 py-0.5 focus-within:border-purple-600 transition-colors">
                                    <span className="text-[9px] text-stone-500">
                                        {field.toUpperCase()}
                                    </span>
                                    <input
                                        type="number"
                                        min="0"
                                        max="12"
                                        value={bonus[field]}
                                        onChange={(event) => onChange(field, event.target.value)}
                                        className="w-7 bg-transparent text-stone-200 text-xs outline-none text-center font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                </div>
                            </React.Fragment>
                        ))}
                    </div>
                </div>
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-stone-800/50">
                    <span className="text-[10px] text-stone-500 uppercase tracking-wider whitespace-nowrap">
                        {hasCap
                            ? `Dąż do capa (${maxCap > 0 ? "+" : ""}${maxCap}%):`
                            : "Dąż do capa:"}
                    </span>
                    {hasCap ? (
                        <button
                            onClick={() => onChange("forceCap", !bonus.forceCap)}
                            aria-label={`Dąż do capa dla ${bonus.value}`}
                            className={toggleClass(bonus.forceCap)}
                        >
                            <Checkmark />
                        </button>
                    ) : (
                        <span className="text-[9px] text-stone-600 uppercase tracking-widest italic">
                            Brak limitu
                        </span>
                    )}
                </div>
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-stone-800/50">
                    <span className="text-[10px] text-stone-500 uppercase tracking-wider whitespace-nowrap">
                        Wymuś konkretny %:
                    </span>
                    <div className="flex items-center gap-2">
                        <div
                            className={`flex items-center gap-1 bg-stone-950 border rounded-sm px-1.5 py-0.5 transition-colors ${bonus.forcePercentage ? "border-purple-600" : "border-stone-700"}`}
                        >
                            <input
                                type="number"
                                min="0"
                                step="0.1"
                                value={bonus.forcedPercentage}
                                disabled={!bonus.forcePercentage}
                                onChange={(event) =>
                                    onChange("forcedPercentage", event.target.value)
                                }
                                aria-label={`Wymuszony procent dla ${bonus.value}`}
                                className="w-14 bg-transparent text-stone-200 text-xs outline-none text-center font-bold disabled:text-stone-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <span className="text-[10px] text-stone-500">%</span>
                        </div>
                        <button
                            onClick={() => onChange("forcePercentage", !bonus.forcePercentage)}
                            aria-label={`Wymuś konkretny procent dla ${bonus.value}`}
                            className={toggleClass(bonus.forcePercentage)}
                        >
                            <Checkmark />
                        </button>
                    </div>
                </div>
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-stone-800/50">
                    <span
                        className="text-[10px] text-stone-500 uppercase tracking-wider whitespace-nowrap"
                        title="Algorytm będzie dążył do najwyższej możliwej wartości tego modyfikatora, po spełnieniu limitów ilościowych i celów capa."
                    >
                        Maksymalizuj mod:
                    </span>
                    <button
                        onClick={() => onChange("maximize", !bonus.maximize)}
                        title="Maksymalizuj wartość moda, wykorzystując najpierw przedmioty z najwyższym bonusem do drifów"
                        className={toggleClass(bonus.maximize, "amber")}
                    >
                        <Checkmark />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OptimizerPriorityForm;
