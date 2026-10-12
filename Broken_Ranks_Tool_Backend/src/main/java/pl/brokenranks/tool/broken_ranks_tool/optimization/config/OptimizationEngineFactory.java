package pl.brokenranks.tool.broken_ranks_tool.optimization.config;

import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentPlacementRules;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.UpgradeLevelPolicy;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.context.OptimizationInitialStateFactory;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationStateEvaluator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result.OptimizationResultAssembler;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.construction.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.evaluation.OptimizationStateEvaluation;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.level.OptimizationLevelAllocator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.maximization.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.neighborhood.OptimizationLargeNeighborhoodSearch;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.pipeline.OptimizationSearchPipeline;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.placement.OptimizationPlacementOperations;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.refinement.OptimizationDeterministicRefiner;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.requirement.OptimizationRequirementSatisfier;

/** Assembles the same search graph for production and tests with explicit domain dependencies. */
public final class OptimizationEngineFactory {
    private OptimizationEngineFactory() {}

    public static OptimizationSearchPipeline createPipeline(
            EquipmentRulesRegistry rules,
            EquipmentPlacementRules placementRules,
            UpgradeLevelPolicy levelPolicy,
            OptimizationStateEvaluator evaluator,
            OptimizationResultAssembler assembler,
            OptimizationLargeNeighborhoodSearch neighborhoodSearch) {
        OptimizationPlacementOperations placements =
                new OptimizationPlacementOperations(placementRules, rules);
        OptimizationStateEvaluation evaluation = new OptimizationStateEvaluation(evaluator);
        OptimizationLevelAllocator levels = new OptimizationLevelAllocator(placements, evaluation);
        OptimizationRequirementSatisfier requirements =
                new OptimizationRequirementSatisfier(placements, evaluation, levels);
        OptimizationInitialStateFactory initialStates =
                new OptimizationInitialStateFactory(levelPolicy);
        return new OptimizationSearchPipeline(
                new OptimizationGreedySearch(
                        initialStates,
                        new MaximizedDrifBonusPrelock(rules),
                        assembler,
                        requirements,
                        placements,
                        evaluation),
                new OptimizationResidualCapacityFiller(placements, evaluation),
                new OptimizationBeamSearch(
                        initialStates, requirements, levels, placements, evaluation),
                levels,
                requirements,
                new OptimizationDeterministicRefiner(placements, evaluation, levels, requirements),
                new OptimizationSelectedBonusMaximizer(
                        placements,
                        evaluation,
                        new OptimizationMaximizationStateComparator(
                                evaluation, evaluator, assembler)),
                neighborhoodSearch,
                evaluator,
                assembler);
    }
}
