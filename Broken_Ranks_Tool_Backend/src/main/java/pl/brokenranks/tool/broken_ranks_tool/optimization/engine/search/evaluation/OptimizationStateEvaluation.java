package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.evaluation;

import java.util.Comparator;
import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationStateEvaluator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.*;

/** Provides search-specific evaluation, ranking, and budget decisions. */
@RequiredArgsConstructor
public final class OptimizationStateEvaluation {
    private final OptimizationStateEvaluator evaluator;

    public int priorityOf(DRIF_BONUS_TYPE type, OptimizationRequest request) {
        return request.getPriorities().getOrDefault(type, 0);
    }

    public int globalCount(BuildState state, DRIF_BONUS_TYPE type, OptimizationContext context) {
        return evaluator.globalCount(state, type, context);
    }

    public int globalCountExcept(
            BuildState state,
            DRIF_BONUS_TYPE candidate,
            DRIF_BONUS_TYPE replaced,
            OptimizationContext context) {
        return evaluator.globalCountExcept(state, candidate, replaced, context);
    }

    public boolean minimumsSatisfied(BuildState state, OptimizationContext context) {
        return evaluator.minimumsSatisfied(state, context);
    }

    public double calculatedValue(
            BuildState state, DRIF_BONUS_TYPE type, OptimizationContext context) {
        return evaluator.calculatedValue(state, type, context);
    }

    public double currentValue(
            BuildState state, DRIF_BONUS_TYPE type, OptimizationContext context) {
        return evaluator.currentValue(state, type, context);
    }

    public double score(BuildState state, OptimizationContext context) {
        return evaluator.score(state, context);
    }

    public boolean trySelectBetter(
            BuildState candidate, BuildState current, OptimizationContext context) {
        return context.refinementSearchBudget().tryConsume()
                && evaluator.isBetterState(candidate, current, context);
    }

    public Comparator<BuildState> stateComparator(OptimizationContext context) {
        return evaluator.stateComparator(context);
    }

    public boolean refinementBudgetExhausted(OptimizationContext context) {
        return context.refinementSearchBudget().exhausted();
    }
}
