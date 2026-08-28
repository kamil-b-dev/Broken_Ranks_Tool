package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result;

import lombok.experimental.UtilityClass;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.EquipmentStatsCalculatorService;
import pl.brokenranks.tool.broken_ranks_tool.optimization.constraints.OptimizationLockService;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationStateEvaluator;

/** Assembles collaborators responsible for optimizer result processing. */
@UtilityClass
public class OptimizationResultFactory {

    public OptimizationResultAssembler create(
            OptimizationLockService lockService,
            EquipmentStatsCalculatorService calculatorService,
            OptimizationStateEvaluator evaluator) {
        OptimizationSetupMapper setupMapper = new OptimizationSetupMapper(lockService);
        OptimizationCalculatorAdapter calculatorAdapter =
                new OptimizationCalculatorAdapter(calculatorService, setupMapper, evaluator);
        return new OptimizationResultAssembler(
                setupMapper,
                calculatorAdapter,
                new OptimizationFinalResultValidator(evaluator),
                new OptimizationSummaryFactory(evaluator, calculatorAdapter, setupMapper));
    }
}
