package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints.directedValue;

import java.util.Map;
import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.EquipmentStatsCalculatorService;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationStateEvaluator;

/** Adapts equipment calculator output to optimizer-directed values and caches. */
@RequiredArgsConstructor
final class OptimizationCalculatorAdapter {

    private final EquipmentStatsCalculatorService calculatorService;
    private final OptimizationSetupMapper setupMapper;
    private final OptimizationStateEvaluator stateEvaluator;

    void calibrateBaseline(BuildState state, OptimizationContext context) {
        Map<String, String> stats = actualStats(state, context);
        for (DRIF_BONUS_TYPE type : context.request().getPriorities().keySet()) {
            if (!stats.containsKey(type.name())) continue;
            double actual =
                    directedValue(type, parseValue(stats.get(type.name())), context.request());
            context.calculatorBaseline()
                    .put(type, actual - stateEvaluator.currentValue(state, type, context));
        }
    }

    double actualValue(BuildState state, DRIF_BONUS_TYPE type, OptimizationContext context) {
        Map<String, String> stats = actualStats(state, context);
        if (!stats.containsKey(type.name())) {
            return stateEvaluator.calculatedValue(state, type, context);
        }
        return directedValue(type, parseValue(stats.get(type.name())), context.request());
    }

    Map<String, String> actualStats(BuildState state, OptimizationContext context) {
        String key = state.signature();
        Map<String, String> cached = context.calculatorCache().get(key);
        if (cached != null) return cached;
        try {
            Map<String, String> calculated =
                    calculatorService.calculateTotalStats(setupMapper.toSetup(state, context));
            context.calculatorCache().put(key, calculated);
            return calculated;
        } catch (RuntimeException exception) {
            return Map.of();
        }
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
