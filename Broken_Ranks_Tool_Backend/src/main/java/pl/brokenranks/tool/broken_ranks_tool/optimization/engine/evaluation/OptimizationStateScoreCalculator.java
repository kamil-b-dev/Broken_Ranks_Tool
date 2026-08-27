package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints.*;

import java.util.Map;
import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;

/** Calculates the heuristic score used to rank candidate states. */
@RequiredArgsConstructor
final class OptimizationStateScoreCalculator {
    private final OptimizationStateValueCalculator valueCalculator;

    double score(StateEvaluation evaluation, OptimizationContext context) {
        if (evaluation.score != null) return evaluation.score;
        Metrics metrics = evaluation.metrics;
        double result = 0;
        for (Map.Entry<DRIF_BONUS_TYPE, Integer> priority : context.sortedPriorities()) {
            DRIF_BONUS_TYPE type = priority.getKey();
            int weight = Math.max(1, priority.getValue() != null ? priority.getValue() : 1);
            double directedValue = valueCalculator.calculatedValue(metrics, type, context);
            Double target = targetFor(type, context.request());
            if (target != null && target > 0) {
                double progress = Math.min(directedValue / target, 1.0);
                result += progress * weight * 1000.0;
                if (directedValue < target) result -= (target - directedValue) * weight * 25.0;
            } else result += directedValue * weight * 100.0;
        }
        for (Map.Entry<DRIF_BONUS_TYPE, OptimizationRequest.QuantityRange> entry :
                context.sortedQuantities()) {
            int count = metrics.counts().getOrDefault(entry.getKey(), 0);
            int min = clampQuantity(entry.getValue().getMin());
            int max = clampQuantity(entry.getValue().getMax());
            if (count < min) result -= (min - count) * 100000.0;
            if (count > max) result -= (count - max) * 100000.0;
        }
        result -= metrics.overflowPower() * 100000.0;
        result += metrics.totalPower() * 0.25;
        evaluation.score = result;
        return result;
    }
}
