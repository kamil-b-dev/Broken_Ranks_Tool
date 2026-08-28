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
import pl.brokenranks.tool.broken_ranks_tool.optimization.constraints.OptimizationLockService;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.context.OptimizationContextFactory;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.context.OptimizationInitialStateFactory;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationStateEvaluator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result.OptimizationResultAssembler;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result.OptimizationResultFactory;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.OptimizationLevelAllocator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.OptimizationPlacementOperations;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.OptimizationSearchPipeline;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.OptimizationStateEvaluation;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.construction.MaximizedDrifBonusPrelock;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.construction.OptimizationBeamSearch;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.construction.OptimizationGreedySearch;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.maximization.OptimizationSelectedBonusMaximizer;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.neighborhood.OptimizationLargeNeighborhoodSearch;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.neighborhood.OptimizationNeighborhoodFactory;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.refinement.OptimizationDeterministicRefiner;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.requirement.OptimizationRequirementSatisfier;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.variant.OptimizationVariantGenerator;

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
            OptimizationStateEvaluator stateEvaluator) {
        return OptimizationResultFactory.create(lockService, calculatorService, stateEvaluator);
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
    OptimizationPlacementOperations optimizationPlacementOperations(
            EquipmentPlacementRules placementRules, EquipmentRulesRegistry rules) {
        return new OptimizationPlacementOperations(placementRules, rules);
    }

    @Bean
    OptimizationStateEvaluation optimizationStateEvaluation(OptimizationStateEvaluator evaluator) {
        return new OptimizationStateEvaluation(evaluator);
    }

    @Bean
    OptimizationLevelAllocator optimizationLevelAllocator(
            OptimizationPlacementOperations placements, OptimizationStateEvaluation evaluation) {
        return new OptimizationLevelAllocator(placements, evaluation);
    }

    @Bean
    OptimizationRequirementSatisfier optimizationRequirementSatisfier(
            OptimizationPlacementOperations placements,
            OptimizationStateEvaluation evaluation,
            OptimizationLevelAllocator levels) {
        return new OptimizationRequirementSatisfier(placements, evaluation, levels);
    }

    @Bean
    OptimizationGreedySearch optimizationGreedySearch(
            OptimizationInitialStateFactory initialStateFactory,
            EquipmentRulesRegistry rules,
            OptimizationResultAssembler resultAssembler,
            OptimizationRequirementSatisfier requirements,
            OptimizationPlacementOperations placements,
            OptimizationStateEvaluation evaluation) {
        return new OptimizationGreedySearch(
                initialStateFactory,
                new MaximizedDrifBonusPrelock(rules),
                resultAssembler,
                requirements,
                placements,
                evaluation);
    }

    @Bean
    OptimizationBeamSearch optimizationBeamSearch(
            OptimizationInitialStateFactory initialStateFactory,
            OptimizationRequirementSatisfier requirements,
            OptimizationLevelAllocator levels,
            OptimizationPlacementOperations placements,
            OptimizationStateEvaluation evaluation) {
        return new OptimizationBeamSearch(
                initialStateFactory, requirements, levels, placements, evaluation);
    }

    @Bean
    OptimizationInitialStateFactory optimizationInitialStateFactory(
            UpgradeLevelPolicy levelPolicy) {
        return new OptimizationInitialStateFactory(levelPolicy);
    }

    @Bean
    OptimizationDeterministicRefiner optimizationDeterministicRefiner(
            OptimizationPlacementOperations placements,
            OptimizationStateEvaluation evaluation,
            OptimizationLevelAllocator levels,
            OptimizationRequirementSatisfier requirements) {
        return new OptimizationDeterministicRefiner(placements, evaluation, levels, requirements);
    }

    @Bean
    OptimizationSelectedBonusMaximizer optimizationSelectedBonusMaximizer(
            OptimizationPlacementOperations placements,
            OptimizationStateEvaluation evaluation,
            OptimizationStateEvaluator evaluator,
            OptimizationResultAssembler resultAssembler) {
        return new OptimizationSelectedBonusMaximizer(
                placements, evaluation, evaluator, resultAssembler);
    }

    @Bean
    OptimizationSearchPipeline optimizationSearchPipeline(
            OptimizationGreedySearch greedySearch,
            OptimizationBeamSearch beamSearch,
            OptimizationLevelAllocator levelAllocator,
            OptimizationRequirementSatisfier requirementSatisfier,
            OptimizationDeterministicRefiner deterministicRefiner,
            OptimizationSelectedBonusMaximizer selectedBonusMaximizer,
            OptimizationLargeNeighborhoodSearch neighborhoodSearch) {
        return new OptimizationSearchPipeline(
                greedySearch,
                beamSearch,
                levelAllocator,
                requirementSatisfier,
                deterministicRefiner,
                selectedBonusMaximizer,
                neighborhoodSearch);
    }
}
