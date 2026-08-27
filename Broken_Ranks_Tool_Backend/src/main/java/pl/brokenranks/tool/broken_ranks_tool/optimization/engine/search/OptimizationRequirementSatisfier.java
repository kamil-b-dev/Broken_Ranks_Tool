package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.*;

/** Compatibility coordinator for independent optimization requirement policies. */
final class OptimizationRequirementSatisfier {
    private final MinimumRequirementSatisfier minimums;
    private final ForcedTargetSatisfier forcedTargets;
    private final RedundantForcedTargetDrifRemover redundantDrifs;

    OptimizationRequirementSatisfier(
            OptimizationStateOperations operations, OptimizationLevelAllocator levels) {
        OptimizationRequirementSupport support = new OptimizationRequirementSupport(operations);
        this.minimums = new MinimumRequirementSatisfier(operations, support);
        this.forcedTargets = new ForcedTargetSatisfier(operations, support);
        this.redundantDrifs = new RedundantForcedTargetDrifRemover(operations, levels, support);
    }

    boolean satisfyMinimums(BuildState state, OptimizationContext context) {
        return minimums.satisfy(state, context);
    }

    void satisfyForcedTargets(BuildState state, OptimizationContext context) {
        forcedTargets.satisfy(state, context);
    }

    BuildState removeRedundantForcedTargetDrifs(BuildState state, OptimizationContext context) {
        return redundantDrifs.remove(state, context);
    }
}
