import { useTranslation } from "../../shared/i18n/useTranslation";
import React from "react";
import { formatPotentialValue } from "./optimizerDomain";
import { DRIF_SIZE_LABELS, DRIF_SIZE_ORDER } from "../../shared/domain/equipment/drifCategories";

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
const SizeConstraints = ({ bonus, onChange }) => {
    const { t } = useTranslation();

    const ranges = bonus.sizeRanges || {};
    const update = (size, field, value) =>
        onChange("sizeRanges", {
            ...ranges,
            [size]: { ...(ranges[size] || { min: 0, max: 12 }), [field]: value },
        });
    const toggle = (size) => {
        if (!ranges[size]) return update(size, "min", 0);
        const next = { ...ranges };
        delete next[size];
        onChange("sizeRanges", next);
    };

    return (
        <details className="optimizer-priority-sizes border-t border-stone-800/50 optimizer-info-divider pt-2">
            <summary className="cursor-pointer text-[10px] uppercase tracking-wider text-stone-400">
                {t("Rozmiary drifów")}
            </summary>
            <div className="mt-2 grid gap-1.5" aria-label={t("Rozmiary dla {0}", [t(bonus.value)])}>
                {DRIF_SIZE_ORDER.map((size) => (
                    <div key={size} className="flex items-center justify-between gap-2">
                        <label className="flex items-center gap-2 text-[10px] text-stone-400">
                            <input
                                type="checkbox"
                                checked={Boolean(ranges[size])}
                                onChange={() => toggle(size)}
                                aria-label={t("Ogranicz {0} dla {1}", [t(size), t(bonus.value)])}
                            />
                            {t(DRIF_SIZE_LABELS[size])} — {t(size)}
                        </label>
                        {ranges[size] ? (
                            <div className="flex items-center gap-1 text-[10px] text-stone-500">
                                <input
                                    type="number"
                                    min="0"
                                    max="12"
                                    value={ranges[size].min}
                                    onChange={(event) => update(size, "min", event.target.value)}
                                    aria-label={t("Minimum {0} dla {1}", [t(size), t(bonus.value)])}
                                    className="w-10 border border-stone-700 bg-stone-950 px-1 py-0.5 text-center text-stone-200"
                                />
                                –
                                <input
                                    type="number"
                                    min="0"
                                    max="12"
                                    value={ranges[size].max}
                                    onChange={(event) => update(size, "max", event.target.value)}
                                    aria-label={t("Maksimum {0} dla {1}", [
                                        t(size),
                                        t(bonus.value),
                                    ])}
                                    className="w-10 border border-stone-700 bg-stone-950 px-1 py-0.5 text-center text-stone-200"
                                />
                            </div>
                        ) : (
                            <span className="text-[9px] uppercase tracking-wider text-stone-600">
                                {t("Dowolnie")}
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </details>
    );
};

const OptimizerPriorityForm = ({
    bonus,
    potential,
    maxCap,
    onChange,
    simple = false,
    weightLabel,
}) => {
    const { t, locale } = useTranslation();

    const hasCap = maxCap !== null && maxCap !== undefined;
    const weightProgress = Math.min(100, Math.max(0, ((Number(bonus.weight) - 1) / 29) * 100));
    const toggleClass = (active, color = "purple") =>
        `optimizer-priority-toggle ${active ? "optimizer-priority-toggle-active" : ""} ${color === "amber" ? "optimizer-priority-toggle-amber" : ""}`;

    return (
        <div className="optimizer-priority-form">
            {potential && (
                <div className="optimizer-priority-potential flex flex-wrap items-center justify-between gap-2 border border-sky-950/80 bg-sky-950/20 px-2 py-1.5">
                    <div className="text-[9px] uppercase tracking-wider text-sky-500">
                        {t("Potencjalny zakres")}
                    </div>
                    <span className="shrink-0 text-xs font-bold text-sky-300 tabular-nums">
                        {formatPotentialValue(potential.potentialMinimum, locale)}–
                        {formatPotentialValue(potential.potentialMaximum, locale)}
                    </span>
                </div>
            )}
            <div className="optimizer-priority-options flex flex-col gap-2 bg-black/30 p-2 rounded-xs border border-stone-800/50 optimizer-info-divider">
                {!simple && (
                    <div className="optimizer-priority-option optimizer-priority-weight flex flex-col gap-1">
                        <div className="flex justify-between items-end">
                            <span className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">
                                {t("Waga priorytetu")}
                            </span>
                            <span className="text-xs text-purple-400 optimizer-accent-text font-bold">
                                {t(bonus.weight)}
                                {t(" ")}
                                <span className="text-stone-600 text-[9px] font-normal">/ 30</span>
                            </span>
                        </div>
                        <input
                            type="range"
                            aria-label={t(weightLabel)}
                            min="1"
                            max="30"
                            value={bonus.weight}
                            onChange={(event) => onChange("weight", event.target.value)}
                            style={{ "--optimizer-range-progress": `${weightProgress}%` }}
                            className="w-full h-1 bg-stone-950 border border-stone-800 optimizer-info-divider rounded-xs appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-purple-900 optimizer-accent-surface [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-purple-400 [&::-webkit-slider-thumb]:rounded-xs [&::-webkit-slider-thumb]:shadow-[0_0_5px_rgba(168,85,247,0.7)] hover:[&::-webkit-slider-thumb]:bg-purple-700 hover:[&::-webkit-slider-thumb]:border-purple-300 transition-all [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-purple-900 [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-purple-400 [&::-moz-range-thumb]:rounded-xs [&::-moz-range-thumb]:shadow-[0_0_5px_rgba(168,85,247,0.7)] hover:[&::-moz-range-thumb]:bg-purple-700 hover:[&::-moz-range-thumb]:border-purple-300"
                        />
                    </div>
                )}
                {!simple && (
                    <div className="optimizer-priority-option optimizer-priority-quantity flex items-center justify-between gap-3">
                        <span className="text-[10px] text-stone-500 uppercase tracking-wider whitespace-nowrap">
                            {t("Limit Ilości:")}
                        </span>
                        <div className="flex items-center gap-2">
                            {["min", "max"].map((field, index) => (
                                <React.Fragment key={field}>
                                    {index > 0 && <span className="text-stone-700">-</span>}
                                    <div className="flex items-center gap-1.5 bg-stone-950 border border-stone-700 rounded-xs px-1.5 py-0.5 focus-within:border-purple-600 optimizer-accent-active transition-colors">
                                        <span className="text-[9px] text-stone-500">
                                            {t(field.toUpperCase())}
                                        </span>
                                        <input
                                            type="number"
                                            min="0"
                                            max="12"
                                            value={bonus[field]}
                                            onChange={(event) =>
                                                onChange(field, event.target.value)
                                            }
                                            aria-label={t("{0} liczba drifów dla {1}", [
                                                t(field === "min" ? "Minimalna" : "Maksymalna"),
                                                t(bonus.value),
                                            ])}
                                            className="w-7 bg-transparent text-stone-200 text-xs outline-hidden text-center font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                    </div>
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                )}
                <div className="optimizer-priority-option flex items-center justify-between gap-3 pt-2 border-t border-stone-800/50 optimizer-info-divider">
                    <span className="text-[10px] text-stone-500 uppercase tracking-wider whitespace-nowrap">
                        {t(
                            hasCap
                                ? `Dąż do capa (${maxCap > 0 ? "+" : ""}${maxCap}%):`
                                : "Dąż do capa:"
                        )}
                    </span>
                    {hasCap ? (
                        <button
                            type="button"
                            onClick={() => onChange("forceCap", !bonus.forceCap)}
                            aria-label={t("Dąż do capa dla {0}", [t(bonus.value)])}
                            aria-pressed={bonus.forceCap}
                            className={toggleClass(bonus.forceCap)}
                        >
                            <Checkmark />
                        </button>
                    ) : (
                        <span className="text-[9px] text-stone-600 uppercase tracking-widest italic">
                            {t("Brak limitu")}
                        </span>
                    )}
                </div>
                {!simple && (
                    <div className="optimizer-priority-option optimizer-priority-percentage flex items-center justify-between gap-3 pt-2 border-t border-stone-800/50 optimizer-info-divider">
                        <span className="text-[10px] text-stone-500 uppercase tracking-wider whitespace-nowrap">
                            {t("Wymuś %:")}
                        </span>
                        <div className="flex items-center gap-2">
                            <div
                                className={`flex items-center gap-1 bg-stone-950 border rounded-xs px-1.5 py-0.5 transition-colors ${bonus.forcePercentage ? "border-purple-600 optimizer-accent-active" : "border-stone-700"}`}
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
                                    aria-label={t("Wymuszony procent dla {0}", [t(bonus.value)])}
                                    className="w-14 bg-transparent text-stone-200 text-xs outline-hidden text-center font-bold disabled:text-stone-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <span className="text-[10px] text-stone-500">%</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => onChange("forcePercentage", !bonus.forcePercentage)}
                                aria-label={t("Wymuś konkretny procent dla {0}", [t(bonus.value)])}
                                aria-pressed={bonus.forcePercentage}
                                className={toggleClass(bonus.forcePercentage)}
                            >
                                <Checkmark />
                            </button>
                        </div>
                    </div>
                )}
                {!simple && (
                    <div className="optimizer-priority-option flex items-center justify-between gap-3 pt-2 border-t border-stone-800/50 optimizer-info-divider">
                        <span
                            className="text-[10px] text-stone-500 uppercase tracking-wider whitespace-nowrap"
                            title={t(
                                "Algorytm będzie dążył do najwyższej możliwej wartości tego modyfikatora, po spełnieniu limitów ilościowych i celów capa."
                            )}
                        >
                            {t("Maksymalizuj mod:")}
                        </span>
                        <button
                            type="button"
                            onClick={() => onChange("maximize", !bonus.maximize)}
                            title={t(
                                "Maksymalizuj wartość moda, wykorzystując najpierw przedmioty z najwyższym bonusem do drifów"
                            )}
                            aria-pressed={bonus.maximize}
                            className={toggleClass(bonus.maximize, "amber")}
                        >
                            <Checkmark />
                        </button>
                    </div>
                )}
                {!simple && <SizeConstraints bonus={bonus} onChange={onChange} />}
            </div>
        </div>
    );
};

export default OptimizerPriorityForm;
