package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result;

import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationStateEvaluator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.GeneratedOptimizationVariant;

import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.EquipmentStatsCalculatorService;
import pl.brokenranks.tool.broken_ranks_tool.optimization.constraints.OptimizationLockService;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationSummary;

import java.util.List;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.BuildState;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.OptimizationContext;

/** Facade for mapping, validating, calculating, and summarizing optimization results. */
public final class OptimizationResultAssembler {

    private final OptimizationSetupMapper setupMapper;
    private final OptimizationCalculatorAdapter calculatorAdapter;
    private final OptimizationFinalResultValidator resultValidator;
    private final OptimizationSummaryFactory summaryFactory;

    public OptimizationResultAssembler(OptimizationLockService lockService,
                                EquipmentStatsCalculatorService calculatorService,
                                OptimizationStateEvaluator stateEvaluator) {
        this.setupMapper = new OptimizationSetupMapper(lockService);
        this.calculatorAdapter = new OptimizationCalculatorAdapter(
                calculatorService, setupMapper, stateEvaluator);
        this.resultValidator = new OptimizationFinalResultValidator(stateEvaluator);
        this.summaryFactory = new OptimizationSummaryFactory(
                stateEvaluator, calculatorAdapter, setupMapper);
    }

    public void calibrateCalculatorBaseline(BuildState state, OptimizationContext context) {
        calculatorAdapter.calibrateBaseline(state, context);
    }

    public EquipmentRequest toSetup(BuildState state, OptimizationContext context) {
        return setupMapper.toSetup(state, context);
    }

    public OptimizationSummary createSummary(
            BuildState state, OptimizationContext context, double executionTime,
            List<String> warnings,
            List<GeneratedOptimizationVariant> variants) {
        return summaryFactory.create(state, context, executionTime, warnings, variants);
    }

    public String validateFinalResult(BuildState state, OptimizationContext context) {
        return resultValidator.validate(state, context);
    }

    public List<String> forcedCapWarnings(BuildState state, OptimizationContext context) {
        return summaryFactory.forcedTargetWarnings(state, context);
    }

    public double actualValue(BuildState state, DRIF_BONUS_TYPE type, OptimizationContext context) {
        return calculatorAdapter.actualValue(state, type, context);
    }
}
