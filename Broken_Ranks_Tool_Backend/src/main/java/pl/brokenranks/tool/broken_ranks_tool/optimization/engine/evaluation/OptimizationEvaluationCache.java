package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation;

import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.*;

/** Owns memoization of expensive state metrics within an optimization context. */
final class OptimizationEvaluationCache {
    StateEvaluation get(
            BuildState state,
            OptimizationContext context,
            OptimizationMetricsCalculator calculator) {
        String key = state.signature();
        StateEvaluation cached = context.evaluationCache().get(key);
        if (cached != null) return cached;
        StateEvaluation calculated = new StateEvaluation(calculator.calculate(state, context));
        context.evaluationCache().put(key, calculated);
        return calculated;
    }
}
