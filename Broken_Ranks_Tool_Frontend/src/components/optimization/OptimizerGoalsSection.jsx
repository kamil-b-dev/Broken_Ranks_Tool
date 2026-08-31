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
        <div className={`optimizer-goal-row ${result.complete ? "is-complete" : "is-partial"}`}>
            <div className="optimizer-goal-name">
                <strong>{goal.bonusName}</strong>
                <small>Priorytet {goal.priority}</small>
            </div>
            <div className="optimizer-goal-value">
                <span>{result.calculatorValue ?? "—"}</span>
                <small>Wynik</small>
            </div>
            <div className="optimizer-goal-count">
                <span>
                    {result.displayedCount} / {goal.minimumCount}–{result.maximumLabel}
                </span>
                <small>Liczba drifów</small>
            </div>
            <div className="optimizer-goal-target">
                <span>{goal.targetLabel || "Maksimum"}</span>
                <small>
                    {current?.penaltyPercent > 0
                        ? `−${current.penaltyPercent.toFixed(0)}%`
                        : "Bez kary"}
                </small>
            </div>
            <span
                className="optimizer-goal-status"
                title={result.complete ? "Osiągnięty" : "Częściowo"}
            >
                <i aria-hidden="true">{result.complete ? "✓" : "!"}</i>
                <span>{result.complete ? "Osiągnięty" : "Częściowo"}</span>
            </span>
        </div>
    );
};

/** Evaluates and presents how well the optimized build fulfills configured priorities. */
const OptimizerGoalsSection = ({ goals, currentDetails, activeVariant, maxCaps }) => (
    <section className="optimizer-report-section optimizer-goals-section">
        <h5>Realizacja celów</h5>
        {!goals?.length ? (
            <p className="text-xs text-stone-600 italic leading-relaxed">
                {currentDetails.length > 0
                    ? `Uruchom optymalizację, aby kalkulator ocenił ${currentDetails.length} wybranych priorytetów.`
                    : "Wyniki priorytetów pojawią się po optymalizacji."}
            </p>
        ) : (
            <div className="optimizer-goals-list">
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
