package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.maximization;

import java.util.List;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationStateEvaluator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result.OptimizationResultAssembler;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.evaluation.OptimizationStateEvaluation;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.neighborhood.OptimizationActualStateComparator;

/** Maximization uses the shared calculator-verified ordering, including consistent tie-breaks. */
public final class OptimizationMaximizationStateComparator {
    private final OptimizationActualStateComparator comparator;

    public OptimizationMaximizationStateComparator(
            OptimizationStateEvaluation evaluation,
            OptimizationStateEvaluator evaluator,
            OptimizationResultAssembler assembler) {
        comparator = new OptimizationActualStateComparator(evaluator, assembler);
    }

    public boolean isBetter(
            BuildState candidate,
            BuildState current,
            OptimizationContext context,
            List<DRIF_BONUS_TYPE> maximizedTypes) {
        return comparator.isBetter(candidate, current, context);
    }
}
