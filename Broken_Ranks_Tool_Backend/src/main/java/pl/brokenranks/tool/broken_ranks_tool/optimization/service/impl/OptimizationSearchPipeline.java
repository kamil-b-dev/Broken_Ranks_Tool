package pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl;

import lombok.RequiredArgsConstructor;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl.OptimizationSearchModel.BuildState;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl.OptimizationSearchModel.OptimizationContext;

/** Executes optimization stages in their required deterministic order. */
@RequiredArgsConstructor
final class OptimizationSearchPipeline {

    private final OptimizationGreedySearch greedySearch;
    private final OptimizationBeamSearch beamSearch;
    private final OptimizationLevelAllocator levelAllocator;
    private final OptimizationRequirementSatisfier requirementSatisfier;
    private final OptimizationDeterministicRefiner deterministicRefiner;
    private final OptimizationSelectedBonusMaximizer selectedBonusMaximizer;
    private final OptimizationLargeNeighborhoodSearch largeNeighborhoodSearch;

    PipelineResult optimize(OptimizationContext context) {
        BuildState state = greedySearch.buildInitialCandidate(context);
        if (state == null) return null;

        if (!context.request().isForceMaximizationByDrifBonus()) {
            state = beamSearch.selectBest(state, context);
        }
        state = optimizeLevelsAndTargets(state, context);
        state = deterministicRefiner.refine(state, context);
        state = greedySearch.fillResidualCapacity(state, context);
        state = optimizeLevelsAndTargets(state, context);
        state = selectedBonusMaximizer.maximize(state, context);

        OptimizationLargeNeighborhoodSearch.SearchResult neighborhoodResult =
                largeNeighborhoodSearch.improve(state, context);
        return new PipelineResult(neighborhoodResult.best(),
                neighborhoodResult.evaluatedStates());
    }

    private BuildState optimizeLevelsAndTargets(BuildState state,
                                                OptimizationContext context) {
        state = levelAllocator.maximizeDrifSizes(state, context);
        state = levelAllocator.allocateByPriority(state, context);
        return requirementSatisfier.removeRedundantForcedTargetDrifs(state, context);
    }

    record PipelineResult(BuildState best,
                          java.util.List<BuildState> evaluatedStates) { }
}
