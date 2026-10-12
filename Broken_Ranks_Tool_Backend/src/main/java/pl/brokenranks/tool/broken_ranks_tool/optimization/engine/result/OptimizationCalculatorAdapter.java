package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints.directedValue;

import java.util.Map;
import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.CalculationResultDto;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.EquipmentStatsCalculatorService;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.NumericStats;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationStateEvaluator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.*;

/** Adapts equipment calculator output to optimizer-directed values and caches. */
@RequiredArgsConstructor
final class OptimizationCalculatorAdapter {

    private final EquipmentStatsCalculatorService calculatorService;
    private final OptimizationSetupMapper setupMapper;
    private final OptimizationStateEvaluator stateEvaluator;

    void calibrateBaseline(BuildState state, OptimizationContext context) {
        Map<String, Double> stats = actualNumeric(state, context).values();
        for (DRIF_BONUS_TYPE type : context.request().getPriorities().keySet()) {
            if (!stats.containsKey(type.name())) continue;
            double actual = directedValue(type, stats.get(type.name()), context.request());
            context.calculatorBaseline()
                    .put(type, actual - stateEvaluator.currentValue(state, type, context));
        }
    }

    double actualValue(BuildState state, DRIF_BONUS_TYPE type, OptimizationContext context) {
        Map<String, Double> stats = actualNumeric(state, context).values();
        if (!stats.containsKey(type.name())) {
            return stateEvaluator.calculatedValue(state, type, context);
        }
        return directedValue(type, stats.get(type.name()), context.request());
    }

    Map<String, String> actualStats(BuildState state, OptimizationContext context) {
        Map<String, String> cached = context.calculatorCache().get(state.signature());
        if (cached != null) {
            context.calculatorSession().metrics().verified(true);
            return cached;
        }
        Map<String, String> formatted = actualNumeric(state, context).formatted();
        context.calculatorCache().put(state.signature(), formatted);
        return formatted;
    }

    private NumericStats actualNumeric(BuildState state, OptimizationContext context) {
        var session = context.calculatorSession();
        String key = state.signature();
        NumericStats cached = session.numericCache().get(key);
        session.metrics().verified(cached != null);
        if (cached != null) return cached;
        Map<String, String> injected = context.calculatorCache().get(key);
        NumericStats calculated;
        if (injected != null) calculated = NumericStats.fromFormatted(injected);
        else
            calculated =
                    session.calculateNumeric(
                            setupMapper.toSetup(state, context),
                            () ->
                                    session.catalog() == null
                                            ? null
                                            : calculatorService.prepareNumericCalculation(
                                                    session.catalog().items(),
                                                    session.catalog().orbs(),
                                                    session.catalog().drifs()),
                            () ->
                                    session.calculate(
                                            setupMapper.toSetup(state, context),
                                            () ->
                                                    calculatorService.prepareCalculation(
                                                            context.items(),
                                                            context.drifs(),
                                                            context.request()
                                                                    .getOriginalSlots()
                                                                    .values()),
                                            calculatorService::calculateTotalStats));
        session.numericCache().put(key, calculated);
        return calculated;
    }

    CalculationResultDto calculationResult(BuildState state, OptimizationContext context) {
        context.calculatorSession().metrics().verified(false);
        return calculatorService.calculateWithSources(setupMapper.toSetup(state, context));
    }

    double parseValue(String value) {
        if (value == null || value.isBlank()) return 0.0;
        try {
            return Double.parseDouble(
                    value.replace("%", "").replace(",", ".").replace("+", "").trim());
        } catch (NumberFormatException exception) {
            return 0.0;
        }
    }
}
