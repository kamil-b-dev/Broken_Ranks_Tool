package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints.directedValue;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints.safeQuantities;

import java.util.Map;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;

/** Answers value, count, and quantity-constraint queries for calculated state metrics. */
final class OptimizationStateValueCalculator {

    double calculatedValue(Metrics metrics, DRIF_BONUS_TYPE type, OptimizationContext context) {
        return currentValue(metrics, type, context)
                + context.calculatorBaseline().getOrDefault(type, 0.0);
    }

    double currentValue(Metrics metrics, DRIF_BONUS_TYPE type, OptimizationContext context) {
        return directedValue(
                type, metrics.searchValues().getOrDefault(type, 0.0), context.request());
    }

    int globalCount(Metrics metrics, DRIF_BONUS_TYPE type) {
        return metrics.searchCounts().getOrDefault(type, 0);
    }

    int globalCountExcept(Metrics metrics, DRIF_BONUS_TYPE candidate, DRIF_BONUS_TYPE replaced) {
        return Math.max(0, globalCount(metrics, candidate) - (candidate == replaced ? 1 : 0));
    }

    boolean minimumsSatisfied(Metrics metrics, OptimizationContext context) {
        for (Map.Entry<DRIF_BONUS_TYPE, OptimizationRequest.QuantityRange> entry :
                safeQuantities(context.request()).entrySet()) {
            int count = globalCount(metrics, entry.getKey());
            if (count < entry.getValue().getMin() || count > entry.getValue().getMax()) {
                return false;
            }
        }
        return true;
    }
}
