package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.DrifOptimizationMath.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints.*;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.*;

/** Calculates structured quality measures and maximization scales for states. */
@RequiredArgsConstructor
final class OptimizationStateQualityCalculator {
    private final EquipmentRulesRegistry rules;
    private final OptimizationMetricsCalculator metricsCalculator;
    private final OptimizationStateValueCalculator valueCalculator;

    Quality quality(StateEvaluation evaluation, OptimizationContext context) {
        if (evaluation.quality != null) return evaluation.quality;
        Metrics metrics = evaluation.metrics;
        int hardViolations = metrics.overflowPower();
        double minimumMaximizedProgress = Double.POSITIVE_INFINITY;
        double maximizedUtility = 0.0;
        boolean hasMaximizedTypes = false;
        double forcedCapDeficit = 0.0;
        double forcedCapExcess = 0.0;
        double weightedUtility = 0.0;
        for (Map.Entry<DRIF_BONUS_TYPE, OptimizationRequest.QuantityRange> entry :
                safeQuantities(context.request()).entrySet()) {
            int count = metrics.counts().getOrDefault(entry.getKey(), 0);
            hardViolations += Math.max(0, entry.getValue().getMin() - count);
            hardViolations += Math.max(0, count - entry.getValue().getMax());
        }
        for (Map.Entry<DRIF_BONUS_TYPE, Integer> entry :
                context.request().getPriorities().entrySet()) {
            DRIF_BONUS_TYPE type = entry.getKey();
            int priority = Math.max(1, entry.getValue() != null ? entry.getValue() : 1);
            double value = valueCalculator.calculatedValue(metrics, type, context);
            if (isMaximized(type, context.request())) {
                hasMaximizedTypes = true;
                double scale = maximizationScale(type, context);
                double progress = scale > 0.0 ? Math.max(0.0, value) / scale : 0.0;
                minimumMaximizedProgress = Math.min(minimumMaximizedProgress, progress);
                maximizedUtility += progress * priority;
            }
            Double target = targetFor(type, context.request());
            if (target != null) {
                forcedCapDeficit += Math.max(0.0, target - value) * priority;
                forcedCapExcess += Math.max(0.0, value - target) * priority;
                weightedUtility += Math.min(value, target) * priority;
            } else weightedUtility += value * priority;
        }
        if (!hasMaximizedTypes) minimumMaximizedProgress = 0.0;
        evaluation.quality =
                new Quality(
                        hardViolations,
                        forcedCapDeficit,
                        minimumMaximizedProgress,
                        maximizedUtility,
                        weightedUtility,
                        metrics.penaltyLoss(),
                        forcedCapExcess,
                        metrics.capacityUtilization(),
                        metrics.totalPower());
        return evaluation.quality;
    }

    double maximizationScale(DRIF_BONUS_TYPE type, OptimizationContext context) {
        Double naturalTarget = maximizationTargetFor(type, context.request());
        if (naturalTarget != null) return naturalTarget;
        return context.maximizationScaleCache()
                .computeIfAbsent(type, ignored -> estimateScale(type, context));
    }

    private double estimateScale(DRIF_BONUS_TYPE type, OptimizationContext context) {
        List<Double> contributions = new ArrayList<>();
        for (SlotContext slot : context.slots()) {
            if (!slot.optimizable()) continue;
            DrifTemplate candidate =
                    slot.candidates().stream()
                            .filter(drif -> drif.getBonusType() == type)
                            .findFirst()
                            .orElse(null);
            if (candidate == null) continue;
            int level = highestLevelForPower(candidate, slot.capacity());
            if (level <= 0) continue;
            double contribution =
                    metricsCalculator.drifValue(candidate, level, context)
                            * (1.0 + slot.drifBonus());
            contributions.add(Math.max(0.0, directedValue(type, contribution, context.request())));
        }
        contributions.sort(Comparator.reverseOrder());
        int limit = Math.min(maxQuantity(type, context.request()), contributions.size());
        double prefix = 0.0;
        double best = 0.0;
        for (int count = 1; count <= limit; count++) {
            prefix += contributions.get(count - 1);
            best = Math.max(best, prefix * rules.getDrifPenalty(count));
        }
        return Math.max(
                1.0, best + Math.max(0.0, context.calculatorBaseline().getOrDefault(type, 0.0)));
    }
}
