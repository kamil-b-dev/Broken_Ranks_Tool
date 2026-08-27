package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.requirement;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.*;

import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.OptimizationLevelAllocator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.OptimizationStateOperations;

/** Compatibility coordinator for independent optimization requirement policies. */
public final class OptimizationRequirementSatisfier {
    private final MinimumRequirementSatisfier minimums;
    private final ForcedTargetSatisfier forcedTargets;
    private final RedundantForcedTargetDrifRemover redundantDrifs;

    public OptimizationRequirementSatisfier(
            OptimizationStateOperations operations, OptimizationLevelAllocator levels) {
        OptimizationRequirementSupport support = new OptimizationRequirementSupport(operations);
        this.minimums = new MinimumRequirementSatisfier(operations, support);
        this.forcedTargets = new ForcedTargetSatisfier(operations, support);
        this.redundantDrifs = new RedundantForcedTargetDrifRemover(operations, levels, support);
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
