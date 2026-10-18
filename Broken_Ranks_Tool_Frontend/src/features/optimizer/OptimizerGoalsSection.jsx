import { useTranslation } from "../../shared/i18n/useTranslation";
import { numericStatValue } from "./optimizerDomain";
import { useOptimizerLabelContext } from "./optimizerLabelContext";

const evaluateGoal = (goal, current, activeVariant, maxCap, advisory) => {
    const variantChange = activeVariant?.statChanges?.find(
        (change) => change.statKey === goal.statKey
    );
    const calculatorValue =
        activeVariant?.calculationResult?.stats?.[goal.statKey] ??
        variantChange?.variantValue ??
        goal.calculatorValue;
    const displayedCount =
        activeVariant?.advisorCounts?.[goal.statKey] ?? current?.count ?? goal.placedCount;
    const quantitySatisfied =
        displayedCount >= goal.minimumCount && displayedCount <= goal.maximumCount;
    const targetValue = Math.abs(numericStatValue(goal.targetLabel));
    const calculatedValue = numericStatValue(calculatorValue);
    const negative =
        Number(maxCap) < 0 ||
        ["MANA_USAGE_REDUCTION", "STAMINA_USAGE_REDUCTION"].includes(goal.statKey);
    const effect = negative ? -calculatedValue : calculatedValue;
    const targetSatisfied =
        (!activeVariant || activeVariant.main) && goal.targetSatisfied != null
            ? goal.targetSatisfied
            : !goal.targetLabel || effect + (advisory ? 1e-8 : 0.5) >= targetValue;

    return {
        calculatorValue,
        displayedCount,
        quantitySatisfied,
        targetSatisfied,
        complete: calculatorValue != null && quantitySatisfied && targetSatisfied !== false,
        maximumLabel: goal.maximumCount >= 2147483647 ? "∞" : goal.maximumCount,
    };
};

const GoalCard = ({ goal, current, activeVariant, maxCap, showTargetLabel, advisory }) => {
    const { t } = useTranslation();

    const { getName } = useOptimizerLabelContext();
    const result = evaluateGoal(goal, current, activeVariant, maxCap, advisory);

    return (
        <div className={`optimizer-goal-row ${result.complete ? "is-complete" : "is-partial"}`}>
            <div className="optimizer-goal-name">
                <strong>{t(getName(goal.statKey, goal.bonusName))}</strong>
                <small>
                    {t("Priorytet ")}
                    {t(goal.priority)}
                </small>
            </div>
            <div className="optimizer-goal-value">
                <span>{t(result.calculatorValue ?? "—")}</span>
                <small>{t("Wynik")}</small>
            </div>
            <div className="optimizer-goal-count">
                <span>
                    {t(result.displayedCount)} / {t(goal.minimumCount)}–{t(result.maximumLabel)}
                </span>
                <small>{t("Liczba drifów")}</small>
            </div>
            <div className="optimizer-goal-target">
                {showTargetLabel && <small>{t("Cel")}</small>}
                <span>{t(goal.targetLabel || "Maksimum")}</span>
                <small>
                    {t(
                        current?.penaltyPercent > 0
                            ? `−${current.penaltyPercent.toFixed(0)}%`
                            : "Bez kary"
                    )}
                </small>
            </div>
            <span
                className="optimizer-goal-status"
                title={t(result.complete ? "Osiągnięty" : "Częściowo")}
            >
                <i aria-hidden="true">{t(result.complete ? "✓" : "!")}</i>
                <span>{t(result.complete ? "Osiągnięty" : "Częściowo")}</span>
            </span>
        </div>
    );
};

/** Evaluates and presents how well the optimized build fulfills configured priorities. */
const OptimizerGoalsSection = ({
    goals,
    currentDetails,
    activeVariant,
    maxCaps,
    showTargetLabel = false,
    advisory = false,
}) => {
    const { t } = useTranslation();

    const { formatText } = useOptimizerLabelContext();
    const missed =
        activeVariant && !activeVariant.main
            ? (goals || []).flatMap((goal) => {
                  const result = evaluateGoal(
                      goal,
                      currentDetails.find((detail) => detail.key === goal.statKey),
                      activeVariant,
                      maxCaps?.[goal.statKey],
                      advisory
                  );
                  return goal.targetLabel && result.targetSatisfied === false
                      ? [
                            `${goal.bonusName}: ${result.calculatorValue ?? "—"} (cel ${goal.targetLabel})`,
                        ]
                      : [];
              })
            : [];
    return (
        <section className="optimizer-report-section optimizer-goals-section">
            <h5>{t("Realizacja celów")}</h5>
            {missed.length > 0 && (
                <div className="is-warning">
                    <p className="optimizer-status-message" role="status">
                        {t("Wybrany wariant nie osiąga celu: ")}
                        {t(formatText(missed.join("; ")))}.
                    </p>
                </div>
            )}
            {goals?.length ? (
                <div className="optimizer-goals-list">
                    {goals.map((goal) => (
                        <GoalCard
                            key={goal.statKey}
                            goal={goal}
                            current={currentDetails.find((detail) => detail.key === goal.statKey)}
                            activeVariant={activeVariant}
                            maxCap={maxCaps?.[goal.statKey]}
                            showTargetLabel={showTargetLabel}
                            advisory={advisory}
                        />
                    ))}
                </div>
            ) : null}
        </section>
    );
};

export default OptimizerGoalsSection;
