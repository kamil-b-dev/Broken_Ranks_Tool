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
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationDrifSizeConstraints;

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
        for (Map.Entry<DRIF_BONUS_TYPE, OptimizationRequest.QuantityRange> entry :
                safeQuantities(context.request()).entrySet()) {
            int count = metrics.counts().getOrDefault(entry.getKey(), 0);
            hardViolations += Math.max(0, entry.getValue().getMin() - count);
            hardViolations += Math.max(0, count - entry.getValue().getMax());
        }
        if (context.request().getDrifSizeQuantities() != null) {
            for (var bonusEntry : context.request().getDrifSizeQuantities().entrySet()) {
                for (var sizeEntry : bonusEntry.getValue().entrySet()) {
                    int count =
                            metrics.sizeCounts()
                                    .getOrDefault(bonusEntry.getKey(), Map.of())
                                    .getOrDefault(sizeEntry.getKey(), 0);
                    hardViolations += Math.max(0, sizeEntry.getValue().getMin() - count);
                    hardViolations +=
                            Math.max(
                                    0,
                                    count
                                            - OptimizationDrifSizeConstraints.maximum(
                                                    bonusEntry.getKey(),
                                                    sizeEntry.getKey(),
                                                    context));
                }
            }
        }
        Quality constraints =
                new Quality(
                        hardViolations,
                        0,
                        0,
                        0,
                        0,
                        metrics.penaltyLoss(),
                        0,
                        metrics.capacityUtilization(),
                        metrics.totalPower());
        evaluation.quality =
                objectives(
                        constraints,
                        context,
                        type -> valueCalculator.calculatedValue(metrics, type, context));
        return evaluation.quality;
    }

    Quality objectives(
            Quality constraints,
            OptimizationContext context,
            java.util.function.ToDoubleFunction<DRIF_BONUS_TYPE> values) {
        double minimumProgress = Double.POSITIVE_INFINITY;
        double maximizedUtility = 0;
        double deficit = 0;
        double excess = 0;
        double utility = 0;
        boolean maximized = false;
        for (var entry : context.sortedPriorities()) {
            DRIF_BONUS_TYPE type = entry.getKey();
            int priority = Math.max(1, entry.getValue() == null ? 1 : entry.getValue());
            double value = values.applyAsDouble(type);
            if (isMaximized(type, context.request())) {
                maximized = true;
                double progress =
                        maximizationProgress(
                                type,
                                usefulValue(type, value, context.request()),
                                maximizationScale(type, context),
                                context.request());
                minimumProgress = Math.min(minimumProgress, progress);
                maximizedUtility += progress * priority;
            }
            Double target = targetFor(type, context.request());
            if (target != null) deficit += Math.max(0, target - value) * priority;
            Double bound = usefulTargetFor(type, context.request());
            if (bound != null) excess += Math.max(0, value - bound) * priority;
            utility += usefulValue(type, value, context.request()) * priority;
        }
        return new Quality(
                constraints.hardViolations(),
                deficit,
                maximized ? minimumProgress : 0,
                maximizedUtility,
                utility,
                constraints.penaltyLoss(),
                excess,
                constraints.capacityUtilization(),
                constraints.totalPower());
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
