package pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl;

import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.EquipmentStatsCalculatorService;
import pl.brokenranks.tool.broken_ranks_tool.optimization.constraints.OptimizationLockService;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationSummary;

import java.util.List;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl.OptimizationSearchModel.BuildState;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl.OptimizationSearchModel.OptimizationContext;

/** Facade for mapping, validating, calculating, and summarizing optimization results. */
final class OptimizationResultAssembler {

    private final OptimizationSetupMapper setupMapper;
    private final OptimizationCalculatorAdapter calculatorAdapter;
    private final OptimizationFinalResultValidator resultValidator;
    private final OptimizationSummaryFactory summaryFactory;

    OptimizationResultAssembler(OptimizationLockService lockService,
                                EquipmentStatsCalculatorService calculatorService,
                                OptimizationStateEvaluator stateEvaluator) {
        this.setupMapper = new OptimizationSetupMapper(lockService);
        this.calculatorAdapter = new OptimizationCalculatorAdapter(
                calculatorService, setupMapper, stateEvaluator);
        this.resultValidator = new OptimizationFinalResultValidator(stateEvaluator);
        this.summaryFactory = new OptimizationSummaryFactory(
                stateEvaluator, calculatorAdapter, setupMapper);
    }

    void calibrateCalculatorBaseline(BuildState state, OptimizationContext context) {
        calculatorAdapter.calibrateBaseline(state, context);
    }

    EquipmentRequest toSetup(BuildState state, OptimizationContext context) {
        return setupMapper.toSetup(state, context);
    }

    OptimizationSummary createSummary(
            BuildState state, OptimizationContext context, double executionTime,
            List<String> warnings,
            List<OptimizationVariantGenerator.GeneratedVariant> variants) {
        return summaryFactory.create(state, context, executionTime, warnings, variants);
    }

    String validateFinalResult(BuildState state, OptimizationContext context) {
        return resultValidator.validate(state, context);
    }

    List<String> forcedCapWarnings(BuildState state, OptimizationContext context) {
        return summaryFactory.forcedTargetWarnings(state, context);
    }

    double actualValue(BuildState state, DRIF_BONUS_TYPE type, OptimizationContext context) {
        return calculatorAdapter.actualValue(state, type, context);
    }
}
