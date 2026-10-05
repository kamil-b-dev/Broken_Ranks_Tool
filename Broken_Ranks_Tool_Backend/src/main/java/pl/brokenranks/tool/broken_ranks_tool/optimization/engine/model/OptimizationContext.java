package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model;

import java.util.AbstractMap;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;

/**
 * One run's read-only input collections and mutable search state. Request DTOs and template
 * entities remain shared, read-only by convention during that run. Baseline, budgets, caches
 * and calculator session are intentionally mutable and may be shared with focused variants
 * of the same run; this context is neither deeply immutable nor safe to share across runs.
 */
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
        Map<DrifLevelKey, Double> drifValueCache,
        OptimizationCalculatorSession calculatorSession) {

    public OptimizationContext {
        items = Collections.unmodifiableMap(new LinkedHashMap<>(items));
        drifs = Collections.unmodifiableMap(new LinkedHashMap<>(drifs));
        slots = Collections.unmodifiableList(new ArrayList<>(slots));
        Map<Double, List<SlotContext>> grouped = new LinkedHashMap<>();
        slotsByDrifBonus.forEach(
                (bonus, values) ->
                        grouped.put(bonus, Collections.unmodifiableList(new ArrayList<>(values))));
        slotsByDrifBonus = Collections.unmodifiableMap(grouped);
        sortedPriorities =
                sortedPriorities.stream()
                        .<Map.Entry<DRIF_BONUS_TYPE, Integer>>map(
                                AbstractMap.SimpleImmutableEntry::new)
                        .toList();
        sortedQuantities =
                sortedQuantities.stream()
                        .<Map.Entry<DRIF_BONUS_TYPE, OptimizationRequest.QuantityRange>>map(
                                AbstractMap.SimpleImmutableEntry::new)
                        .toList();
    }

    public OptimizationContext(
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
            Map<DrifLevelKey, Double> drifValueCache) {
        this(
                request,
                items,
                drifs,
                slots,
                slotsByDrifBonus,
                sortedPriorities,
                sortedQuantities,
                beamSearchBudget,
                maximizationSearchBudget,
                refinementSearchBudget,
                calculatorBaseline,
                maximizationScaleCache,
                calculatorCache,
                evaluationCache,
                drifValueCache,
                new OptimizationCalculatorSession());
    }
}
