package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation;

import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.DrifOptimizationMath.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.*;

/** Calculates and caches deterministic quality measures for candidate states. */
public final class OptimizationStateEvaluator {

    private final EquipmentRulesRegistry rules;
    private final OptimizationMetricsCalculator metricsCalculator;

    public OptimizationStateEvaluator(EquipmentRulesRegistry rules) {
        this.rules = rules;
        this.metricsCalculator = new OptimizationMetricsCalculator(rules);
    }

    public boolean isBetterState(BuildState candidate, BuildState current, OptimizationContext context) {
        int comparison = compareQuality(quality(candidate, context), quality(current, context));
        if (comparison != 0) return comparison > 0;
        return candidate.signature().compareTo(current.signature()) < 0;
    }

    /** Compares only hard constraints, forced caps, and maximization objectives. */
    public boolean isBetterMaximizationState(BuildState candidate, BuildState current,
                                      OptimizationContext context) {
        Quality candidateQuality = quality(candidate, context);
        Quality currentQuality = quality(current, context);
        if (candidateQuality.hardViolations() != currentQuality.hardViolations()) {
            return candidateQuality.hardViolations() < currentQuality.hardViolations();
        }
        int comparison = Double.compare(
                currentQuality.forcedCapDeficit(), candidateQuality.forcedCapDeficit());
        if (comparison != 0) return comparison > 0;
        comparison = Double.compare(candidateQuality.minimumMaximizedProgress(),
                currentQuality.minimumMaximizedProgress());
        if (comparison != 0) return comparison > 0;
        return Double.compare(candidateQuality.maximizedUtility(),
                currentQuality.maximizedUtility()) > 0;
    }

    public Comparator<BuildState> stateComparator(OptimizationContext context) {
        return (left, right) -> {
            int comparison = compareQuality(quality(left, context), quality(right, context));
            if (comparison != 0) return -comparison;
            return left.signature().compareTo(right.signature());
        };
    }

    public double score(BuildState state, OptimizationContext context) {
        StateEvaluation evaluation = evaluation(state, context);
        if (evaluation.score != null) return evaluation.score;

        Metrics metrics = evaluation.metrics;
        double result = 0;
        for (Map.Entry<DRIF_BONUS_TYPE, Integer> priority : context.sortedPriorities()) {
            DRIF_BONUS_TYPE type = priority.getKey();
            int weight = Math.max(1, priority.getValue() != null ? priority.getValue() : 1);
            double directedValue = calculatedValue(metrics, type, context);
            Double target = targetFor(type, context.request());

            if (target != null && target > 0) {
                double progress = Math.min(directedValue / target, 1.0);
                result += progress * weight * 1000.0;
                if (directedValue < target) result -= (target - directedValue) * weight * 25.0;
            } else {
                result += directedValue * weight * 100.0;
            }

        }

        for (Map.Entry<DRIF_BONUS_TYPE, OptimizationRequest.QuantityRange> entry
                : context.sortedQuantities()) {
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

    public double calculatedValue(BuildState state, DRIF_BONUS_TYPE type, OptimizationContext context) {
        return calculatedValue(metrics(state, context), type, context);
    }

    public double currentValue(BuildState state, DRIF_BONUS_TYPE type, OptimizationContext context) {
        return directedValue(type, metrics(state, context).searchValues().getOrDefault(type, 0.0),
                context.request());
    }

    public int globalCount(BuildState state, DRIF_BONUS_TYPE type, OptimizationContext context) {
        return metrics(state, context).searchCounts().getOrDefault(type, 0);
    }

    public int globalCountExcept(BuildState state, DRIF_BONUS_TYPE candidate,
                          DRIF_BONUS_TYPE replaced, OptimizationContext context) {
        return Math.max(0, globalCount(state, candidate, context) - (candidate == replaced ? 1 : 0));
    }

    public boolean minimumsSatisfied(BuildState state, OptimizationContext context) {
        for (Map.Entry<DRIF_BONUS_TYPE, OptimizationRequest.QuantityRange> entry
                : safeQuantities(context.request()).entrySet()) {
            int count = globalCount(state, entry.getKey(), context);
            if (count < entry.getValue().getMin() || count > entry.getValue().getMax()) return false;
        }
        return true;
    }

    public Metrics metrics(BuildState state, OptimizationContext context) {
        return evaluation(state, context).metrics;
    }

    private Quality quality(BuildState state, OptimizationContext context) {
        StateEvaluation evaluation = evaluation(state, context);
        if (evaluation.quality != null) return evaluation.quality;

        Metrics metrics = evaluation.metrics;
        int hardViolations = metrics.overflowPower();
        double minimumMaximizedProgress = Double.POSITIVE_INFINITY;
        double maximizedUtility = 0.0;
        boolean hasMaximizedTypes = false;
        double forcedCapDeficit = 0.0;
        double forcedCapExcess = 0.0;
        double weightedUtility = 0.0;

        for (Map.Entry<DRIF_BONUS_TYPE, OptimizationRequest.QuantityRange> entry
                : safeQuantities(context.request()).entrySet()) {
            int count = metrics.counts().getOrDefault(entry.getKey(), 0);
            hardViolations += Math.max(0, entry.getValue().getMin() - count);
            hardViolations += Math.max(0, count - entry.getValue().getMax());
        }

        for (Map.Entry<DRIF_BONUS_TYPE, Integer> entry : context.request().getPriorities().entrySet()) {
            DRIF_BONUS_TYPE type = entry.getKey();
            int priority = Math.max(1, entry.getValue() != null ? entry.getValue() : 1);
            double value = calculatedValue(metrics, type, context);
            boolean maximized = isMaximized(type, context.request());
            if (maximized) {
                hasMaximizedTypes = true;
                double scale = maximizationScale(type, context);
                double progress = scale > 0.0 ? Math.max(0.0, value) / scale : 0.0;
                minimumMaximizedProgress = Math.min(minimumMaximizedProgress, progress);
                maximizedUtility += progress * priority;
            }

            Double target = targetFor(type, context.request());
            if (target != null) {
                double deficit = Math.max(0.0, target - value);
                forcedCapDeficit += deficit * priority;
                forcedCapExcess += Math.max(0.0, value - target) * priority;
                weightedUtility += Math.min(value, target) * priority;
            } else {
                weightedUtility += value * priority;
            }
        }

        if (!hasMaximizedTypes) minimumMaximizedProgress = 0.0;

        Quality quality = new Quality(hardViolations, forcedCapDeficit,
                minimumMaximizedProgress, maximizedUtility,
                weightedUtility, metrics.penaltyLoss(), forcedCapExcess,
                metrics.capacityUtilization(), metrics.totalPower());
        evaluation.quality = quality;
        return quality;
    }

    private int compareQuality(Quality left, Quality right) {
        int comparison = Integer.compare(right.hardViolations(), left.hardViolations());
        if (comparison != 0) return comparison;
        comparison = Double.compare(right.forcedCapDeficit(), left.forcedCapDeficit());
        if (comparison != 0) return comparison;
        comparison = Double.compare(left.weightedUtility(), right.weightedUtility());
        if (comparison != 0) return comparison;
        comparison = Double.compare(right.penaltyLoss(), left.penaltyLoss());
        if (comparison != 0) return comparison;
        comparison = Double.compare(right.forcedCapExcess(), left.forcedCapExcess());
        if (comparison != 0) return comparison;
        comparison = Double.compare(left.capacityUtilization(), right.capacityUtilization());
        if (comparison != 0) return comparison;
        return Integer.compare(left.totalPower(), right.totalPower());
    }

    /**
     * Estimates a common scale for comparing different maximized modifiers.
     * The estimate is an optimistic per-slot upper bound and is used only for
     * balancing multiple objectives, not as a hard target.
     */
    public double maximizationScale(DRIF_BONUS_TYPE type, OptimizationContext context) {
        Double naturalTarget = maximizationTargetFor(type, context.request());
        if (naturalTarget != null) return naturalTarget;

        return context.maximizationScaleCache().computeIfAbsent(type, ignored -> {
            List<Double> contributions = new ArrayList<>();
            for (SlotContext slot : context.slots()) {
                if (!slot.optimizable()) continue;
                DrifTemplate candidate = slot.candidates().stream()
                        .filter(drif -> drif.getBonusType() == type)
                        .findFirst()
                        .orElse(null);
                if (candidate == null) continue;
                int level = highestLevelForPower(candidate, slot.capacity());
                if (level <= 0) continue;
                double contribution = metricsCalculator.drifValue(candidate, level, context)
                        * (1.0 + slot.drifBonus());
                contributions.add(Math.max(0.0,
                        directedValue(type, contribution, context.request())));
            }
            contributions.sort(Comparator.reverseOrder());

            int limit = Math.min(maxQuantity(type, context.request()), contributions.size());
            double prefix = 0.0;
            double best = 0.0;
            for (int count = 1; count <= limit; count++) {
                prefix += contributions.get(count - 1);
                best = Math.max(best, prefix * rules.getDrifPenalty(count));
            }
            return Math.max(1.0,
                    best + Math.max(0.0, context.calculatorBaseline().getOrDefault(type, 0.0)));
        });
    }

    private double calculatedValue(Metrics metrics, DRIF_BONUS_TYPE type,
                                   OptimizationContext context) {
        return directedValue(type, metrics.searchValues().getOrDefault(type, 0.0), context.request())
                + context.calculatorBaseline().getOrDefault(type, 0.0);
    }

    private StateEvaluation evaluation(BuildState state, OptimizationContext context) {
        String key = state.signature();
        StateEvaluation cached = context.evaluationCache().get(key);
        if (cached != null) return cached;
        StateEvaluation calculated = new StateEvaluation(metricsCalculator.calculate(state, context));
        context.evaluationCache().put(key, calculated);
        return calculated;
    }
}
