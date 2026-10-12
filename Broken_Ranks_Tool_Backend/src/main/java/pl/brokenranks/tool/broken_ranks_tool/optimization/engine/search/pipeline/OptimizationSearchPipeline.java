package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.pipeline;

import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationStateEvaluator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.BuildState;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationContext;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result.OptimizationResultAssembler;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.construction.OptimizationBeamSearch;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.construction.OptimizationGreedySearch;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.construction.OptimizationResidualCapacityFiller;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.level.OptimizationLevelAllocator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.maximization.OptimizationSelectedBonusMaximizer;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.neighborhood.OptimizationActualStateComparator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.neighborhood.OptimizationLargeNeighborhoodSearch;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.refinement.OptimizationDeterministicRefiner;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.requirement.OptimizationRequirementSatisfier;

/** Executes optimization stages in their required deterministic order. */
public final class OptimizationSearchPipeline {

    private final OptimizationGreedySearch greedySearch;
    private final OptimizationResidualCapacityFiller residualCapacityFiller;
    private final OptimizationBeamSearch beamSearch;
    private final OptimizationLevelAllocator levelAllocator;
    private final OptimizationRequirementSatisfier requirementSatisfier;
    private final OptimizationDeterministicRefiner deterministicRefiner;
    private final OptimizationSelectedBonusMaximizer selectedBonusMaximizer;
    private final OptimizationLargeNeighborhoodSearch largeNeighborhoodSearch;
    private final OptimizationResultAssembler assembler;
    private final OptimizationActualStateComparator comparator;

    public OptimizationSearchPipeline(
            OptimizationGreedySearch greedySearch,
            OptimizationResidualCapacityFiller residualCapacityFiller,
            OptimizationBeamSearch beamSearch,
            OptimizationLevelAllocator levelAllocator,
            OptimizationRequirementSatisfier requirementSatisfier,
            OptimizationDeterministicRefiner deterministicRefiner,
            OptimizationSelectedBonusMaximizer selectedBonusMaximizer,
            OptimizationLargeNeighborhoodSearch largeNeighborhoodSearch,
            OptimizationStateEvaluator evaluator,
            OptimizationResultAssembler assembler) {
        this.greedySearch = greedySearch;
        this.residualCapacityFiller = residualCapacityFiller;
        this.beamSearch = beamSearch;
        this.levelAllocator = levelAllocator;
        this.requirementSatisfier = requirementSatisfier;
        this.deterministicRefiner = deterministicRefiner;
        this.selectedBonusMaximizer = selectedBonusMaximizer;
        this.largeNeighborhoodSearch = largeNeighborhoodSearch;
        this.assembler = assembler;
        this.comparator = new OptimizationActualStateComparator(evaluator, assembler);
    }

    public PipelineResult optimize(OptimizationContext context) {
        BuildState state =
                stage("construction", context, () -> greedySearch.buildInitialCandidate(context));
        if (state == null) return null;
        OptimizationCheckpoints checkpoints =
                new OptimizationCheckpoints(assembler, comparator, context);
        checkpoints.remember(state);

        if (!context.request().isForceMaximizationByDrifBonus()) {
            state =
                    stage(
                            "beam",
                            state,
                            context,
                            candidate -> beamSearch.selectBest(candidate, context));
            checkpoints.remember(state);
        }
        state = optimizeLevelsAndTargets(state, context, checkpoints);
        state =
                stage(
                        "refinement",
                        state,
                        context,
                        candidate -> deterministicRefiner.refine(candidate, context));
        checkpoints.remember(state);
        state =
                stage(
                        "residualFill",
                        state,
                        context,
                        candidate -> residualCapacityFiller.fill(candidate, context));
        checkpoints.remember(state);
        state = optimizeLevelsAndTargets(state, context, checkpoints);
        state =
                stage(
                        "maximization",
                        state,
                        context,
                        candidate -> selectedBonusMaximizer.maximize(candidate, context));
        checkpoints.remember(state);

        if (checkpoints.seeds().isEmpty()) return null;

        OptimizationLargeNeighborhoodSearch.SearchResult neighborhoodResult =
                largeNeighborhoodSearch.improve(checkpoints.seeds(), context);
        return new PipelineResult(neighborhoodResult.best(), neighborhoodResult.evaluatedStates());
    }

    public BuildState maximizeSelectedBonuses(BuildState state, OptimizationContext context) {
        return selectedBonusMaximizer.maximize(state, context);
    }

    private BuildState optimizeLevelsAndTargets(
            BuildState state, OptimizationContext context, OptimizationCheckpoints checkpoints) {
        state =
                stage(
                        "sizes",
                        state,
                        context,
                        candidate -> levelAllocator.maximizeDrifSizes(candidate, context));
        checkpoints.remember(state);
        state =
                stage(
                        "levels",
                        state,
                        context,
                        candidate -> levelAllocator.allocateByPriority(candidate, context));
        checkpoints.remember(state);
        state =
                stage(
                        "targetCleanup",
                        state,
                        context,
                        candidate ->
                                requirementSatisfier.removeRedundantForcedTargetDrifs(
                                        candidate, context));
        checkpoints.remember(state);
        return state;
    }

    private BuildState stage(
            String name,
            BuildState state,
            OptimizationContext context,
            java.util.function.Function<BuildState, BuildState> transform) {
        return stage(name, context, () -> transform.apply(state));
    }

    private BuildState stage(
            String name,
            OptimizationContext context,
            java.util.function.Supplier<BuildState> transform) {
        long start = System.nanoTime();
        try {
            return transform.get();
        } finally {
            context.calculatorSession().metrics().recordStage(name, start, context);
        }
    }

    public record PipelineResult(BuildState best, java.util.List<BuildState> evaluatedStates) {}
}
