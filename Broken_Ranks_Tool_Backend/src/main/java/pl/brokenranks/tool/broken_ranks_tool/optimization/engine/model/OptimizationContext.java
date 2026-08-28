package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model;

import java.util.List;
import java.util.Map;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;

/** Immutable data and search-scoped caches shared by optimization stages. */
public record OptimizationContext(
        OptimizationRequest request,
        Map<Long, ItemTemplate> items,
        Map<Long, DrifTemplate> drifs,
        List<SlotContext> slots,
        Map<Double, List<SlotContext>> slotsByDrifBonus,
        List<Map.Entry<DRIF_BONUS_TYPE, Integer>> sortedPriorities,
        List<Map.Entry<DRIF_BONUS_TYPE, OptimizationRequest.QuantityRange>> sortedQuantities,
        SearchBudget beamSearchBudget,
        SearchBudget maximizationSearchBudget,
        SearchBudget refinementSearchBudget,
        Map<DRIF_BONUS_TYPE, Double> calculatorBaseline,
        Map<DRIF_BONUS_TYPE, Double> maximizationScaleCache,
        Map<String, Map<String, String>> calculatorCache,
        Map<String, StateEvaluation> evaluationCache,
        Map<DrifLevelKey, Double> drifValueCache) {}
