package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.neighborhood;

import lombok.experimental.UtilityClass;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationStateEvaluator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result.OptimizationResultAssembler;

/** Assembles the internal collaborators used by large-neighborhood search. */
@UtilityClass
public class OptimizationNeighborhoodFactory {

    public OptimizationLargeNeighborhoodSearch create(
            EquipmentRulesRegistry rules,
            OptimizationStateEvaluator evaluator,
            OptimizationResultAssembler resultAssembler) {
        OptimizationActualStateComparator comparator =
                new OptimizationActualStateComparator(evaluator, resultAssembler);
        OptimizationNeighborhoodSupport support = new OptimizationNeighborhoodSupport(evaluator);
        OptimizationMinimumRepairGenerator minimumRepair =
                new OptimizationMinimumRepairGenerator(evaluator, support);
        OptimizationForcedTargetRepairGenerator forcedRepair =
                new OptimizationForcedTargetRepairGenerator(evaluator, support, minimumRepair);
        OptimizationDirectedSwapGenerator swaps =
                new OptimizationDirectedSwapGenerator(evaluator, support, forcedRepair);
        OptimizationDirectedMoveSearch directedMoves =
                new OptimizationDirectedMoveSearch(evaluator, comparator, support, swaps);
        return new OptimizationLargeNeighborhoodSearch(
                rules, evaluator, comparator, support, directedMoves);
    }
}
