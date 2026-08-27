package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.DrifOptimizationMath.calculateDrifValue;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.DrifOptimizationMath.power;

import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;

/** Calculates raw counts, values, power, penalties, and capacity utilization. */
@RequiredArgsConstructor
final class OptimizationMetricsCalculator {

    private final EquipmentRulesRegistry rules;

    Metrics calculate(BuildState state, OptimizationContext context) {
        MetricAccumulator accumulator = new MetricAccumulator();
        for (SlotContext slot : context.slots()) {
            accumulateSlot(state, slot, context, accumulator);
        }
        return accumulator.toMetrics(rules);
    }

    private void accumulateSlot(
            BuildState state,
            SlotContext slot,
            OptimizationContext context,
            MetricAccumulator accumulator) {
        List<Placement> placements = state.slots().getOrDefault(slot.key(), List.of());
        int usedPower = 0;
        Set<DRIF_BONUS_TYPE> unique = new HashSet<>();
        for (Placement placement : placements) {
            if (placement == null || placement.drif() == null) continue;
            DRIF_BONUS_TYPE type = placement.drif().getBonusType();
            double value =
                    drifValue(placement.drif(), placement.level(), context)
                            * (1.0 + slot.drifBonus());
            accumulator.searchCounts.merge(type, 1, Integer::sum);
            accumulator.searchRawValues.merge(type, value, Double::sum);
            if (!unique.add(type)) continue;
            if (!slot.special()) {
                int placementPower = power(placement.drif(), placement.level());
                usedPower += placementPower;
                accumulator.totalPower += placementPower;
            }
            accumulator.counts.merge(type, 1, Integer::sum);
            accumulator.rawValues.merge(type, value, Double::sum);
        }
        if (!slot.special()) {
            accumulator.usedCapacity += Math.min(usedPower, slot.capacity());
            accumulator.totalCapacity += slot.capacity();
            accumulator.overflowPower += Math.max(0, usedPower - slot.capacity());
        }
    }

    double drifValue(DrifTemplate drif, int level, OptimizationContext context) {
        return context.drifValueCache()
                .computeIfAbsent(
                        new DrifLevelKey(drif.getId(), level),
                        ignored -> calculateDrifValue(drif, level));
    }

    private static final class MetricAccumulator {
        private final Map<DRIF_BONUS_TYPE, Integer> counts = new LinkedHashMap<>();
        private final Map<DRIF_BONUS_TYPE, Double> rawValues = new LinkedHashMap<>();
        private final Map<DRIF_BONUS_TYPE, Integer> searchCounts = new LinkedHashMap<>();
        private final Map<DRIF_BONUS_TYPE, Double> searchRawValues = new LinkedHashMap<>();
        private int totalPower;
        private int overflowPower;
        private int usedCapacity;
        private int totalCapacity;

        private Metrics toMetrics(EquipmentRulesRegistry rules) {
            Map<DRIF_BONUS_TYPE, Double> searchValues = penalizedSearchValues(rules);
            double penaltyLoss = penaltyLoss(rules);
            double utilization = totalCapacity > 0 ? (double) usedCapacity / totalCapacity : 0.0;
            return new Metrics(
                    counts,
                    searchCounts,
                    searchValues,
                    totalPower,
                    overflowPower,
                    utilization,
                    penaltyLoss);
        }

        private Map<DRIF_BONUS_TYPE, Double> penalizedSearchValues(EquipmentRulesRegistry rules) {
            Map<DRIF_BONUS_TYPE, Double> values = new LinkedHashMap<>();
            searchRawValues.forEach(
                    (type, value) ->
                            values.put(
                                    type,
                                    value
                                            * rules.getDrifPenalty(
                                                    searchCounts.getOrDefault(type, 0))));
            return values;
        }

        private double penaltyLoss(EquipmentRulesRegistry rules) {
            double loss = 0.0;
            for (Map.Entry<DRIF_BONUS_TYPE, Double> entry : rawValues.entrySet()) {
                double penalty = rules.getDrifPenalty(counts.getOrDefault(entry.getKey(), 0));
                loss += Math.abs(entry.getValue()) * (1.0 - penalty);
            }
            return loss;
        }
    }
}
