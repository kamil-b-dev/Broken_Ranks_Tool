package pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl;

import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.DrifTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.ItemTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.OrbTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.EquipmentStatsCalculatorService;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.processor.ItemStatProcessor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentPlacementRules;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.UpgradeLevelPolicy;
import pl.brokenranks.tool.broken_ranks_tool.optimization.config.OptimizationEngineFactory;
import pl.brokenranks.tool.broken_ranks_tool.optimization.config.OptimizationProperties;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.context.OptimizationContextFactory;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationStateEvaluator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result.OptimizationResultAssembler;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result.OptimizationResultFactory;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.neighborhood.OptimizationLargeNeighborhoodSearch;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.neighborhood.OptimizationNeighborhoodFactory;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.validation.OptimizationInputValidator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.variant.OptimizationVariantGenerator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.locking.OptimizationLockService;

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
        return create(
                drifRepository,
                itemRepository,
                org.mockito.Mockito.mock(OrbTemplateRepository.class),
                placementRules,
                levelPolicy,
                rules,
                itemStatProcessor,
                lockService,
                calculatorService);
    }

    static CustomModsOptimizationServiceImpl create(
            DrifTemplateRepository drifRepository,
            ItemTemplateRepository itemRepository,
            OrbTemplateRepository orbRepository,
            EquipmentPlacementRules placementRules,
            UpgradeLevelPolicy levelPolicy,
            EquipmentRulesRegistry rules,
            ItemStatProcessor itemStatProcessor,
            OptimizationLockService lockService,
            EquipmentStatsCalculatorService calculatorService) {
        OptimizationStateEvaluator evaluator = new OptimizationStateEvaluator(rules);
        OptimizationResultAssembler assembler =
                OptimizationResultFactory.create(
                        lockService, calculatorService, evaluator, placementRules);
        OptimizationLargeNeighborhoodSearch neighborhoodSearch =
                OptimizationNeighborhoodFactory.create(rules, evaluator, assembler);
        return new CustomModsOptimizationServiceImpl(
                new OptimizationProperties(55_000, 20_000, 25_000, 1),
                new OptimizationInputValidator(placementRules, rules, orbRepository),
                new OptimizationContextFactory(
                        drifRepository,
                        itemRepository,
                        placementRules,
                        levelPolicy,
                        itemStatProcessor),
                OptimizationEngineFactory.createPipeline(
                        rules,
                        placementRules,
                        levelPolicy,
                        evaluator,
                        assembler,
                        neighborhoodSearch),
                assembler,
                new OptimizationVariantGenerator(neighborhoodSearch, evaluator, assembler),
                null,
                new pl.brokenranks.tool.broken_ranks_tool.optimization.reorganization
                        .ReorganizationSearch(placementRules, evaluator, assembler));
    }
}
