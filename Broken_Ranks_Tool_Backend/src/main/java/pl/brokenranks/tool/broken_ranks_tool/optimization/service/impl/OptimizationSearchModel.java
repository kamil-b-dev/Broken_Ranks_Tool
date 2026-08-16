package pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl;

import lombok.AllArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.experimental.UtilityClass;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/** Internal data model shared by deterministic optimization stages. */
@UtilityClass
class OptimizationSearchModel {

    record PlacementChoice(DrifTemplate drif, int level, double gain) { }

    record RequiredPlacementChoice(SlotContext slot, DrifTemplate drif, int level, double gain) { }

    record Placement(DrifTemplate drif, int level, boolean locked) { }

    record SlotContext(String key, EquipmentRequest.SlotData original, ItemTemplate item,
                       int capacity, int maxDrifs, double drifBonus,
                       List<DrifTemplate> candidates, Set<Integer> lockedIndices,
                       boolean special) {

        boolean optimizable() {
            return !special && maxDrifs > 0;
        }
    }

    record OptimizationContext(
            OptimizationRequest request,
            Map<Long, ItemTemplate> items,
            Map<Long, DrifTemplate> drifs,
            List<SlotContext> slots,
            Map<Double, List<SlotContext>> slotsByDrifBonus,
            List<Map.Entry<DRIF_BONUS_TYPE, Integer>> sortedPriorities,
            List<Map.Entry<DRIF_BONUS_TYPE, OptimizationRequest.QuantityRange>> sortedQuantities,
            SearchBudget searchBudget,
            Map<DRIF_BONUS_TYPE, Double> calculatorBaseline,
            Map<String, Map<String, String>> calculatorCache,
            Map<String, StateEvaluation> evaluationCache,
            Map<DrifLevelKey, Double> drifValueCache) { }

    static final class BuildState {
        final Map<String, List<Placement>> slots = new HashMap<>();
        private String cachedSignature;

        BuildState copy() {
            BuildState copy = new BuildState();
            slots.forEach((key, values) -> copy.slots.put(key, new ArrayList<>(values)));
            copy.cachedSignature = cachedSignature;
            return copy;
        }

        String signature() {
            if (cachedSignature == null) {
                cachedSignature = slots.entrySet().stream().sorted(Map.Entry.comparingByKey())
                        .map(entry -> entry.getKey() + ":" + entry.getValue().stream()
                                .map(placement -> placement == null
                                        ? "_"
                                        : placement.drif().getId() + "@" + placement.level())
                                .collect(Collectors.joining(",")))
                        .collect(Collectors.joining("|"));
            }
            return cachedSignature;
        }

        void setPlacement(String slotKey, int index, Placement placement) {
            slots.get(slotKey).set(index, placement);
            cachedSignature = null;
        }
    }

    @AllArgsConstructor
    static final class SearchBudget {
        private int remaining;

        boolean consume() {
            return remaining-- <= 0;
        }
    }

    record Quality(int hardViolations, double forcedCapDeficit, int missingCritical,
                   double criticalPlacementBonus, double weightedUtility, double penaltyLoss,
                   double forcedCapExcess, double capacityUtilization, int totalPower) { }

    @RequiredArgsConstructor
    static final class StateEvaluation {
        final Metrics metrics;
        Quality quality;
        Double score;
    }

    record DrifLevelKey(Long drifId, int level) { }

    record Metrics(Map<DRIF_BONUS_TYPE, Integer> counts,
                   Map<DRIF_BONUS_TYPE, Integer> searchCounts,
                   Map<DRIF_BONUS_TYPE, Double> searchValues,
                   int totalPower, int overflowPower, double capacityUtilization,
                   double penaltyLoss) { }
}
