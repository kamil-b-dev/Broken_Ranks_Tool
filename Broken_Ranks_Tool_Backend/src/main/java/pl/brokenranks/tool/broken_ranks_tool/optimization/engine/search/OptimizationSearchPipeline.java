package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.BuildState;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.OptimizationContext;

import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentPlacementRules;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.context.OptimizationInitialStateFactory;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationStateEvaluator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result.OptimizationResultAssembler;
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
            EquipmentPlacementRules placementRules,
            EquipmentRulesRegistry rules,
            OptimizationStateEvaluator stateEvaluator,
            OptimizationResultAssembler resultAssembler,
            OptimizationInitialStateFactory initialStateFactory,
            OptimizationLargeNeighborhoodSearch largeNeighborhoodSearch) {
        OptimizationStateOperations stateOperations =
                new OptimizationStateOperations(placementRules, rules, stateEvaluator);
        this.levelAllocator = new OptimizationLevelAllocator(stateOperations);
        this.requirementSatisfier =
                new OptimizationRequirementSatisfier(stateOperations, levelAllocator);
        this.greedySearch =
                new OptimizationGreedySearch(
                        initialStateFactory,
                        new MaximizedDrifBonusPrelock(rules),
                        resultAssembler,
                        requirementSatisfier,
                        stateOperations);
        this.beamSearch =
                new OptimizationBeamSearch(
                        initialStateFactory, requirementSatisfier, levelAllocator, stateOperations);
        this.deterministicRefiner =
                new OptimizationDeterministicRefiner(
                        stateOperations, levelAllocator, requirementSatisfier);
        this.selectedBonusMaximizer =
                new OptimizationSelectedBonusMaximizer(
                        stateOperations, stateEvaluator, resultAssembler);
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
