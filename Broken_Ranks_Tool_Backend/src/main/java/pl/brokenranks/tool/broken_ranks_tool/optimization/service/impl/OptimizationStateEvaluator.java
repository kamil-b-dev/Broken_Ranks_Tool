package pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl;

import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl.DrifOptimizationMath.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl.OptimizationRequestConstraints.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl.OptimizationSearchModel.*;

/** Calculates and caches deterministic quality measures for candidate states. */
@RequiredArgsConstructor
final class OptimizationStateEvaluator {

    private final EquipmentRulesRegistry rules;

    boolean isBetterState(BuildState candidate, BuildState current, OptimizationContext context) {
        int comparison = compareQuality(quality(candidate, context), quality(current, context));
        if (comparison != 0) return comparison > 0;
        return candidate.signature().compareTo(current.signature()) < 0;
    }

    /** Compares only hard constraints, forced caps, and maximization objectives. */
    boolean isBetterMaximizationState(BuildState candidate, BuildState current,
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

    Comparator<BuildState> stateComparator(OptimizationContext context) {
        return (left, right) -> {
            int comparison = compareQuality(quality(left, context), quality(right, context));
            if (comparison != 0) return -comparison;
            return left.signature().compareTo(right.signature());
        };
    }

    double score(BuildState state, OptimizationContext context) {
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

    double calculatedValue(BuildState state, DRIF_BONUS_TYPE type, OptimizationContext context) {
        return calculatedValue(metrics(state, context), type, context);
    }

    double currentValue(BuildState state, DRIF_BONUS_TYPE type, OptimizationContext context) {
        return directedValue(type, metrics(state, context).searchValues().getOrDefault(type, 0.0),
                context.request());
    }

    int globalCount(BuildState state, DRIF_BONUS_TYPE type, OptimizationContext context) {
        return metrics(state, context).searchCounts().getOrDefault(type, 0);
    }

    int globalCountExcept(BuildState state, DRIF_BONUS_TYPE candidate,
                          DRIF_BONUS_TYPE replaced, OptimizationContext context) {
        return Math.max(0, globalCount(state, candidate, context) - (candidate == replaced ? 1 : 0));
    }

    boolean minimumsSatisfied(BuildState state, OptimizationContext context) {
        for (Map.Entry<DRIF_BONUS_TYPE, OptimizationRequest.QuantityRange> entry
                : safeQuantities(context.request()).entrySet()) {
            int count = globalCount(state, entry.getKey(), context);
            if (count < entry.getValue().getMin() || count > entry.getValue().getMax()) return false;
        }
        return true;
    }

    Metrics metrics(BuildState state, OptimizationContext context) {
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
    double maximizationScale(DRIF_BONUS_TYPE type, OptimizationContext context) {
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
                double contribution = drifValue(candidate, level, context)
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
        StateEvaluation calculated = new StateEvaluation(calculateMetrics(state, context));
        context.evaluationCache().put(key, calculated);
        return calculated;
    }

    private Metrics calculateMetrics(BuildState state, OptimizationContext context) {
        Map<DRIF_BONUS_TYPE, Integer> counts = new LinkedHashMap<>();
        Map<DRIF_BONUS_TYPE, Double> rawValues = new LinkedHashMap<>();
        Map<DRIF_BONUS_TYPE, Integer> searchCounts = new LinkedHashMap<>();
        Map<DRIF_BONUS_TYPE, Double> searchRawValues = new LinkedHashMap<>();
        int totalPower = 0;
        int overflowPower = 0;
        int usedCapacity = 0;
        int totalCapacity = 0;

        for (SlotContext slot : context.slots()) {
            List<Placement> placements = state.slots.getOrDefault(slot.key(), List.of());
            int used = 0;
            Set<DRIF_BONUS_TYPE> unique = new HashSet<>();
            for (Placement placement : placements) {
                if (placement == null || placement.drif() == null) continue;
                DRIF_BONUS_TYPE type = placement.drif().getBonusType();
                double drifValue = drifValue(placement.drif(), placement.level(), context)
                        * (1.0 + slot.drifBonus());
                searchCounts.merge(type, 1, Integer::sum);
                searchRawValues.merge(type, drifValue, Double::sum);
                if (!unique.add(type)) continue;
                if (!slot.special()) {
                    int placementPower = power(placement.drif(), placement.level());
                    used += placementPower;
                    totalPower += placementPower;
                }
                counts.merge(type, 1, Integer::sum);
                rawValues.merge(type, drifValue, Double::sum);
            }
            if (!slot.special()) {
                usedCapacity += Math.min(used, slot.capacity());
                totalCapacity += slot.capacity();
                overflowPower += Math.max(0, used - slot.capacity());
            }
        }

        Map<DRIF_BONUS_TYPE, Double> searchValues = new LinkedHashMap<>();
        double penaltyLoss = 0;
        for (Map.Entry<DRIF_BONUS_TYPE, Double> entry : rawValues.entrySet()) {
            double penalty = rules.getDrifPenalty(counts.getOrDefault(entry.getKey(), 0));
            penaltyLoss += Math.abs(entry.getValue()) * (1.0 - penalty);
        }
        for (Map.Entry<DRIF_BONUS_TYPE, Double> entry : searchRawValues.entrySet()) {
            double penalty = rules.getDrifPenalty(searchCounts.getOrDefault(entry.getKey(), 0));
            searchValues.put(entry.getKey(), entry.getValue() * penalty);
        }

        double utilization = totalCapacity > 0 ? (double) usedCapacity / totalCapacity : 0.0;
        return new Metrics(counts, searchCounts, searchValues,
                totalPower, overflowPower, utilization, penaltyLoss);
    }

    private double drifValue(DrifTemplate drif, int level, OptimizationContext context) {
        return context.drifValueCache().computeIfAbsent(new DrifLevelKey(drif.getId(), level),
                ignored -> calculateDrifValue(drif, level));
    }
}
