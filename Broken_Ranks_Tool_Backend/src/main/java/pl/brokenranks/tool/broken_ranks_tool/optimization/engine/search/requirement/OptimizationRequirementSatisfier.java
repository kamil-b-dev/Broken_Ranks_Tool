package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.requirement;

import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.evaluation.OptimizationStateEvaluation;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.level.OptimizationLevelAllocator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.placement.OptimizationPlacementOperations;

/** Compatibility coordinator for independent optimization requirement policies. */
public final class OptimizationRequirementSatisfier {
    private final MinimumRequirementSatisfier minimums;
    private final ForcedTargetSatisfier forcedTargets;
    private final RedundantForcedTargetDrifRemover redundantDrifs;

    public OptimizationRequirementSatisfier(
            OptimizationPlacementOperations placements,
            OptimizationStateEvaluation evaluation,
            OptimizationLevelAllocator levels) {
        OptimizationRequirementSupport support = new OptimizationRequirementSupport(placements);
        this.minimums = new MinimumRequirementSatisfier(placements, evaluation, support);
        this.forcedTargets = new ForcedTargetSatisfier(placements, evaluation, support);
        this.redundantDrifs =
                new RedundantForcedTargetDrifRemover(placements, evaluation, levels, support);
    }

    public boolean satisfyMinimums(BuildState state, OptimizationContext context) {
        return minimums.satisfy(state, context);
    }

    public void satisfyForcedTargets(BuildState state, OptimizationContext context) {
        forcedTargets.satisfy(state, context);
    }

    public BuildState removeRedundantForcedTargetDrifs(
            BuildState state, OptimizationContext context) {
        return redundantDrifs.remove(state, context);
    }
}
