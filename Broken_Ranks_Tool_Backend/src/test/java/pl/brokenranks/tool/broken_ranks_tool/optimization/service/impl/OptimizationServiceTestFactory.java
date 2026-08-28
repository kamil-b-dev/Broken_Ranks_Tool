package pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl;

import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.DrifTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.ItemTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.EquipmentStatsCalculatorService;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.processor.ItemStatProcessor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentPlacementRules;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.UpgradeLevelPolicy;
import pl.brokenranks.tool.broken_ranks_tool.optimization.constraints.OptimizationLockService;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.context.OptimizationContextFactory;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.context.OptimizationInitialStateFactory;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationStateEvaluator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result.OptimizationResultAssembler;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result.OptimizationResultFactory;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.OptimizationLevelAllocator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.OptimizationSearchPipeline;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.OptimizationStateOperations;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.construction.MaximizedDrifBonusPrelock;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.construction.OptimizationBeamSearch;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.construction.OptimizationGreedySearch;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.maximization.OptimizationSelectedBonusMaximizer;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.neighborhood.OptimizationLargeNeighborhoodSearch;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.neighborhood.OptimizationNeighborhoodFactory;
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
        OptimizationStateOperations operations =
                new OptimizationStateOperations(placementRules, rules, evaluator);
        OptimizationLevelAllocator levels = new OptimizationLevelAllocator(operations);
        OptimizationRequirementSatisfier requirements =
                new OptimizationRequirementSatisfier(operations, levels);
        OptimizationInitialStateFactory initialStates =
                new OptimizationInitialStateFactory(levelPolicy);
        return new CustomModsOptimizationServiceImpl(
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
                                operations),
                        new OptimizationBeamSearch(initialStates, requirements, levels, operations),
                        levels,
                        requirements,
                        new OptimizationDeterministicRefiner(operations, levels, requirements),
                        new OptimizationSelectedBonusMaximizer(operations, evaluator, assembler),
                        neighborhoodSearch),
                assembler,
                new OptimizationVariantGenerator(neighborhoodSearch, evaluator, assembler));
    }
}
