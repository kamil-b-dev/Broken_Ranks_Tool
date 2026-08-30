import React from "react";
import { numericStatValue } from "./optimizerDomain";

const evaluateGoal = (goal, current, activeVariant, maxCap) => {
    const variantChange = activeVariant?.statChanges?.find(
        (change) => change.statKey === goal.statKey
    );
    const calculatorValue = variantChange?.variantValue ?? goal.calculatorValue;
    const displayedCount = current?.count ?? goal.placedCount;
    const quantitySatisfied =
        displayedCount >= goal.minimumCount && displayedCount <= goal.maximumCount;
    const targetValue = numericStatValue(goal.targetLabel);
    const calculatedValue = numericStatValue(calculatorValue);
    const targetSatisfied =
        !goal.targetLabel ||
        (Number(maxCap) < 0 ? -calculatedValue >= targetValue : calculatedValue >= targetValue);

    return {
        calculatorValue,
        displayedCount,
        quantitySatisfied,
        targetSatisfied,
        complete: calculatorValue != null && quantitySatisfied && targetSatisfied !== false,
        maximumLabel: goal.maximumCount >= 2147483647 ? "∞" : goal.maximumCount,
    };
};

const GoalCard = ({ goal, current, activeVariant, maxCap }) => {
    const result = evaluateGoal(goal, current, activeVariant, maxCap);

    return (
        <div className="border border-stone-800/80 bg-black/20 p-2.5">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="text-xs font-semibold text-stone-300">{goal.bonusName}</div>
                    <div className="mt-1 text-[9px] uppercase tracking-wider text-stone-600">
                        Priorytet {goal.priority}
                    </div>
                </div>
                <span
                    className={`shrink-0 border px-2 py-1 text-[9px] uppercase tracking-wider ${
                        result.complete
                            ? "border-emerald-900/80 bg-emerald-950/30 text-emerald-400"
                            : "border-amber-900/80 bg-amber-950/30 text-amber-300"
                    }`}
                >
                    {result.complete ? "Osiągnięty" : "Częściowo"}
                </span>
            </div>
            <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 border-t border-stone-800/70 pt-2 text-[10px]">
                <dt className="text-stone-500">Liczba drifów</dt>
                <dd
                    className={
                        result.quantitySatisfied
                            ? "text-right text-emerald-400 tabular-nums"
                            : "text-right text-amber-300 tabular-nums"
                    }
                >
                    {result.displayedCount} / {goal.minimumCount}–{result.maximumLabel}
                </dd>
                <dt className="text-stone-500">Kara za liczbę modów</dt>
                <dd
                    className={
                        current?.penaltyPercent > 0
                            ? "text-right text-amber-300 tabular-nums"
                            : "text-right text-emerald-400 tabular-nums"
                    }
                >
                    {current?.penaltyPercent > 0
                        ? `−${current.penaltyPercent.toFixed(0)}%`
                        : "Bez kary"}
                </dd>
                {goal.targetLabel && (
                    <>
                        <dt className="text-stone-500">Cel wartości</dt>
                        <dd
                            className={
                                result.targetSatisfied
                                    ? "text-right text-emerald-400 tabular-nums"
                                    : "text-right text-amber-300 tabular-nums"
                            }
                        >
                            {goal.targetLabel}
                        </dd>
                    </>
                )}
            </dl>
        </div>
    );
};

/** Evaluates and presents how well the optimized build fulfills configured priorities. */
const OptimizerGoalsSection = ({ goals, currentDetails, activeVariant, maxCaps }) => (
    <section className="bg-black/40 border border-stone-800 rounded-sm p-3 lg:col-span-2">
        <h5 className="text-[10px] text-stone-400 uppercase tracking-widest font-semibold mb-3">
            Realizacja priorytetów
        </h5>
        {!goals?.length ? (
            <p className="text-xs text-stone-600 italic leading-relaxed">
                {currentDetails.length > 0
                    ? `Uruchom optymalizację, aby kalkulator ocenił ${currentDetails.length} wybranych priorytetów.`
                    : "Wyniki priorytetów pojawią się po optymalizacji."}
            </p>
        ) : (
            <div className="grid gap-2 xl:grid-cols-2">
                {goals.map((goal) => (
                    <GoalCard
                        key={goal.statKey}
                        goal={goal}
                        current={currentDetails.find((detail) => detail.key === goal.statKey)}
                        activeVariant={activeVariant}
                        maxCap={maxCaps?.[goal.statKey]}
                    />
                ))}
            </div>
        )}
    </section>
);

export default OptimizerGoalsSection;
