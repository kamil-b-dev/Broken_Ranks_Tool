package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.refinement;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.*;

import java.util.List;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.OptimizationLevelAllocator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.OptimizationPlacementOperations;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.OptimizationStateEvaluation;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.requirement.OptimizationRequirementSatisfier;

/** Coordinates deterministic refinement stages in their established business order. */
public final class OptimizationDeterministicRefiner {
    private static final int MAX_ROUNDS = 3;
    private final OptimizationStateEvaluation evaluation;
    private final OptimizationLevelAllocator levels;
    private final OptimizationRequirementSatisfier requirements;
    private final List<DeterministicRefinementStrategy> strategies;

    public OptimizationDeterministicRefiner(
            OptimizationPlacementOperations placements,
            OptimizationStateEvaluation evaluation,
            OptimizationLevelAllocator levels,
            OptimizationRequirementSatisfier requirements) {
        this.evaluation = evaluation;
        this.levels = levels;
        this.requirements = requirements;
        this.strategies =
                List.of(
                        new OptimizationReplacementStrategy(placements, evaluation, levels),
                        new OptimizationPlacementReorganizationStrategy(
                                placements, evaluation, levels),
                        new OptimizationForcedTargetConsolidationStrategy(
                                placements, evaluation, levels),
                        new OptimizationPenaltyReductionStrategy(placements, evaluation, levels));
    }

    public BuildState refine(BuildState state, OptimizationContext context) {
        for (int round = 0;
                round < MAX_ROUNDS && !evaluation.refinementBudgetExhausted(context);
                round++) {
            String before = state.signature();
            for (DeterministicRefinementStrategy strategy : strategies)
                state = strategy.refine(state, context);
            state = requirements.removeRedundantForcedTargetDrifs(state, context);
            state = levels.allocateByPriority(state, context);
            if (before.equals(state.signature())) break;
        }
        return state;
    }
}
