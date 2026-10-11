package pl.brokenranks.tool.broken_ranks_tool.optimization.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.DrifTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.ItemTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.EquipmentStatsCalculatorService;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.processor.ItemStatProcessor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentPlacementRules;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.UpgradeLevelPolicy;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.context.OptimizationContextFactory;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationStateEvaluator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result.OptimizationResultAssembler;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result.OptimizationResultFactory;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.neighborhood.OptimizationLargeNeighborhoodSearch;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.neighborhood.OptimizationNeighborhoodFactory;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.pipeline.OptimizationSearchPipeline;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.variant.OptimizationVariantGenerator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.locking.OptimizationLockService;

/** Defines the optimizer object graph independently from its application service. */
@Configuration
public class OptimizationEngineConfig {

    @Bean
    OptimizationStateEvaluator optimizationStateEvaluator(EquipmentRulesRegistry rules) {
        return new OptimizationStateEvaluator(rules);
    }

    @Bean
    OptimizationResultAssembler optimizationResultAssembler(
            OptimizationLockService lockService,
            EquipmentStatsCalculatorService calculatorService,
            OptimizationStateEvaluator stateEvaluator,
            EquipmentPlacementRules placementRules) {
        return OptimizationResultFactory.create(
                lockService, calculatorService, stateEvaluator, placementRules);
    }

    @Bean
    OptimizationLargeNeighborhoodSearch optimizationLargeNeighborhoodSearch(
            EquipmentRulesRegistry rules,
            OptimizationStateEvaluator stateEvaluator,
            OptimizationResultAssembler resultAssembler) {
        return OptimizationNeighborhoodFactory.create(rules, stateEvaluator, resultAssembler);
    }

    @Bean
    OptimizationVariantGenerator optimizationVariantGenerator(
            OptimizationLargeNeighborhoodSearch neighborhoodSearch,
            OptimizationStateEvaluator stateEvaluator,
            OptimizationResultAssembler resultAssembler) {
        return new OptimizationVariantGenerator(
                neighborhoodSearch, stateEvaluator, resultAssembler);
    }

    @Bean
    OptimizationContextFactory optimizationContextFactory(
            DrifTemplateRepository drifRepository,
            ItemTemplateRepository itemRepository,
            EquipmentPlacementRules placementRules,
            UpgradeLevelPolicy levelPolicy,
            ItemStatProcessor itemStatProcessor) {
        return new OptimizationContextFactory(
                drifRepository, itemRepository, placementRules, levelPolicy, itemStatProcessor);
    }

    @Bean
    OptimizationSearchPipeline optimizationSearchPipeline(
            EquipmentRulesRegistry rules,
            EquipmentPlacementRules placementRules,
            UpgradeLevelPolicy levelPolicy,
            OptimizationStateEvaluator evaluator,
            OptimizationResultAssembler assembler,
            OptimizationLargeNeighborhoodSearch neighborhoodSearch) {
        return OptimizationEngineFactory.createPipeline(
                rules, placementRules, levelPolicy, evaluator, assembler, neighborhoodSearch);
    }
}
