package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.BuildState;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.OptimizationContext;

import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.construction.OptimizationBeamSearch;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.construction.OptimizationGreedySearch;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.maximization.OptimizationSelectedBonusMaximizer;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.neighborhood.OptimizationLargeNeighborhoodSearch;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.refinement.OptimizationDeterministicRefiner;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.requirement.OptimizationRequirementSatisfier;

/** Executes optimization stages in their required deterministic order. */
public final class OptimizationSearchPipeline {

    private final OptimizationGreedySearch greedySearch;
    private final OptimizationBeamSearch beamSearch;
    private final OptimizationLevelAllocator levelAllocator;
    private final OptimizationRequirementSatisfier requirementSatisfier;
    private final OptimizationDeterministicRefiner deterministicRefiner;
    private final OptimizationSelectedBonusMaximizer selectedBonusMaximizer;
    private final OptimizationLargeNeighborhoodSearch largeNeighborhoodSearch;

    public OptimizationSearchPipeline(
            OptimizationGreedySearch greedySearch,
            OptimizationBeamSearch beamSearch,
            OptimizationLevelAllocator levelAllocator,
            OptimizationRequirementSatisfier requirementSatisfier,
            OptimizationDeterministicRefiner deterministicRefiner,
            OptimizationSelectedBonusMaximizer selectedBonusMaximizer,
            OptimizationLargeNeighborhoodSearch largeNeighborhoodSearch) {
        this.greedySearch = greedySearch;
        this.beamSearch = beamSearch;
        this.levelAllocator = levelAllocator;
        this.requirementSatisfier = requirementSatisfier;
        this.deterministicRefiner = deterministicRefiner;
        this.selectedBonusMaximizer = selectedBonusMaximizer;
        this.largeNeighborhoodSearch = largeNeighborhoodSearch;
    }

    public PipelineResult optimize(OptimizationContext context) {
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
        return new PipelineResult(neighborhoodResult.best(), neighborhoodResult.evaluatedStates());
    }

    public BuildState maximizeSelectedBonuses(BuildState state, OptimizationContext context) {
        return selectedBonusMaximizer.maximize(state, context);
    }

    private BuildState optimizeLevelsAndTargets(BuildState state, OptimizationContext context) {
        state = levelAllocator.maximizeDrifSizes(state, context);
        state = levelAllocator.allocateByPriority(state, context);
        return requirementSatisfier.removeRedundantForcedTargetDrifs(state, context);
    }

    public record PipelineResult(BuildState best, java.util.List<BuildState> evaluatedStates) {}
}
