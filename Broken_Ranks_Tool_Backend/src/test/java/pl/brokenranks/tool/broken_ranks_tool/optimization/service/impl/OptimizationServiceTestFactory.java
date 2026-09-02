package pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl;

import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.DrifTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.ItemTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.EquipmentStatsCalculatorService;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.processor.ItemStatProcessor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentPlacementRules;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.UpgradeLevelPolicy;
import pl.brokenranks.tool.broken_ranks_tool.optimization.config.OptimizationProperties;
import pl.brokenranks.tool.broken_ranks_tool.optimization.constraints.OptimizationLockService;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.context.OptimizationContextFactory;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.context.OptimizationInitialStateFactory;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationStateEvaluator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result.OptimizationResultAssembler;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result.OptimizationResultFactory;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.construction.MaximizedDrifBonusPrelock;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.construction.OptimizationBeamSearch;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.construction.OptimizationGreedySearch;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.construction.OptimizationResidualCapacityFiller;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.evaluation.OptimizationStateEvaluation;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.level.OptimizationLevelAllocator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.maximization.OptimizationMaximizationStateComparator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.maximization.OptimizationSelectedBonusMaximizer;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.neighborhood.OptimizationLargeNeighborhoodSearch;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.neighborhood.OptimizationNeighborhoodFactory;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.pipeline.OptimizationSearchPipeline;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.placement.OptimizationPlacementOperations;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.refinement.OptimizationDeterministicRefiner;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.requirement.OptimizationRequirementSatisfier;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.variant.OptimizationVariantGenerator;

final class OptimizationServiceTestFactory {

    private OptimizationServiceTestFactory() {}

    static CustomModsOptimizationServiceImpl create(
            DrifTemplateRepository drifRepository,
            ItemTemplateRepository itemRepository,
            EquipmentPlacementRules placementRules,
            UpgradeLevelPolicy levelPolicy,
            EquipmentRulesRegistry rules,
            ItemStatProcessor itemStatProcessor,
            OptimizationLockService lockService,
            EquipmentStatsCalculatorService calculatorService) {
        OptimizationStateEvaluator evaluator = new OptimizationStateEvaluator(rules);
        OptimizationResultAssembler assembler =
                OptimizationResultFactory.create(lockService, calculatorService, evaluator);
        OptimizationLargeNeighborhoodSearch neighborhoodSearch =
                OptimizationNeighborhoodFactory.create(rules, evaluator, assembler);
        OptimizationPlacementOperations placements =
                new OptimizationPlacementOperations(placementRules, rules);
        OptimizationStateEvaluation evaluation = new OptimizationStateEvaluation(evaluator);
        OptimizationLevelAllocator levels = new OptimizationLevelAllocator(placements, evaluation);
        OptimizationRequirementSatisfier requirements =
                new OptimizationRequirementSatisfier(placements, evaluation, levels);
        OptimizationInitialStateFactory initialStates =
                new OptimizationInitialStateFactory(levelPolicy);
        return new CustomModsOptimizationServiceImpl(
                new OptimizationProperties(55_000, 20_000, 25_000, 1),
                new OptimizationContextFactory(
                        drifRepository,
                        itemRepository,
                        placementRules,
                        levelPolicy,
                        itemStatProcessor),
                new OptimizationSearchPipeline(
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
                        new OptimizationDeterministicRefiner(
                                placements, evaluation, levels, requirements),
                        new OptimizationSelectedBonusMaximizer(
                                placements,
                                evaluation,
                                new OptimizationMaximizationStateComparator(
                                        evaluation, evaluator, assembler)),
                        neighborhoodSearch),
                assembler,
                new OptimizationVariantGenerator(neighborhoodSearch, evaluator, assembler));
    }
}
