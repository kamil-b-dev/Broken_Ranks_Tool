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
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.OptimizationSearchPipeline;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.neighborhood.OptimizationLargeNeighborhoodSearch;
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
                new OptimizationResultAssembler(lockService, calculatorService, evaluator);
        OptimizationLargeNeighborhoodSearch neighborhoodSearch =
                new OptimizationLargeNeighborhoodSearch(rules, evaluator, assembler);
        return new CustomModsOptimizationServiceImpl(
                new OptimizationContextFactory(
                        drifRepository,
                        itemRepository,
                        placementRules,
                        levelPolicy,
                        itemStatProcessor),
                new OptimizationSearchPipeline(
                        placementRules,
                        rules,
                        evaluator,
                        assembler,
                        new OptimizationInitialStateFactory(levelPolicy),
                        neighborhoodSearch),
                assembler,
                new OptimizationVariantGenerator(neighborhoodSearch, evaluator, assembler));
    }
}
