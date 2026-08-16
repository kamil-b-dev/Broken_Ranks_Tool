package pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl;

import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;

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
                if (directedValue > target && !isForcedCap(type, context.request())) {
                    result -= (directedValue - target) * weight * 5.0;
                }
            } else {
                result += directedValue * weight * 100.0;
            }

            if (isCritical(type, context.request())) {
                int count = metrics.counts().getOrDefault(type, 0);
                if (count == 0) result -= 200000.0;
                else result += Math.min(count, 3) * weight * 75.0;
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
            if (globalCount(state, entry.getKey(), context) < entry.getValue().getMin()) return false;
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
        int missingCritical = 0;
        double forcedCapDeficit = 0.0;
        double forcedCapExcess = 0.0;
        double targetDeficit = 0.0;
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
            int count = metrics.counts().getOrDefault(type, 0);
            if (isCritical(type, context.request()) && count == 0) missingCritical++;

            double value = calculatedValue(metrics, type, context);
            Double target = targetFor(type, context.request());
            if (target != null) {
                double deficit = Math.max(0.0, target - value);
                if (isForcedCap(type, context.request())) {
                    forcedCapDeficit += deficit * priority;
                    forcedCapExcess += Math.max(0.0, value - target) * priority;
                } else {
                    targetDeficit += deficit * priority;
                }
                weightedUtility += Math.min(value, target) * priority;
            } else {
                weightedUtility += value * priority;
            }
        }

        Quality quality = new Quality(hardViolations, forcedCapDeficit, missingCritical, targetDeficit,
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
        comparison = Integer.compare(right.missingCritical(), left.missingCritical());
        if (comparison != 0) return comparison;
        comparison = Double.compare(right.targetDeficit(), left.targetDeficit());
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
                int placementPower = power(placement.drif(), placement.level());
                used += placementPower;
                totalPower += placementPower;
                counts.merge(type, 1, Integer::sum);
                rawValues.merge(type, drifValue, Double::sum);
            }
            usedCapacity += Math.min(used, slot.capacity());
            totalCapacity += slot.capacity();
            overflowPower += Math.max(0, used - slot.capacity());
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
