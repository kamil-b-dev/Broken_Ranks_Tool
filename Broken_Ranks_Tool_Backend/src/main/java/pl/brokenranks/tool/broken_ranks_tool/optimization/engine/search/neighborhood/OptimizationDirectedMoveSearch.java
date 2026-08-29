package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.neighborhood;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationStateEvaluator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.*;

/** Coordinates directed neighborhood moves and selects their strongest finalists. */
@RequiredArgsConstructor
final class OptimizationDirectedMoveSearch {
    private static final int DIRECTED_FINALISTS = 24;
    private final OptimizationStateEvaluator stateEvaluator;
    private final OptimizationActualStateComparator actualStateComparator;
    private final OptimizationNeighborhoodSupport neighborhoodSupport;
    private final OptimizationDirectedSwapGenerator directedSwapGenerator;

    BuildState improve(
            BuildState current,
            OptimizationContext context,
            OptimizationNeighborhoodSearchControl control) {
        List<BuildState> candidates = new ArrayList<>();
        candidates.add(current);
        List<SlotContext> slots = eligibleSlots(context);
        for (int lowIndex = 0; lowIndex < slots.size() && !control.exhausted(); lowIndex++) {
            for (int highIndex = slots.size() - 1;
                    highIndex > lowIndex && !control.exhausted();
                    highIndex--) {
                SlotContext low = slots.get(lowIndex);
                SlotContext high = slots.get(highIndex);
                if (high.drifBonus() > low.drifBonus()) {
                    directedSwapGenerator.addCandidates(
                            current, low, high, context, control, candidates);
                }
            }
        }
        BuildState best = current;
        for (BuildState candidate : finalists(candidates, context)) {
            control.rememberEvaluated(candidate);
            if (!candidate.signature().equals(best.signature())
                    && actualStateComparator.isBetter(candidate, best, context)) best = candidate;
        }
        return best;
    }

    private List<SlotContext> eligibleSlots(OptimizationContext context) {
        return context.slots().stream()
                .filter(SlotContext::optimizable)
                .filter(slot -> !neighborhoodSupport.isSlotLocked(slot, context))
                .sorted(Comparator.comparingDouble(SlotContext::drifBonus))
                .toList();
    }

    private List<BuildState> finalists(List<BuildState> candidates, OptimizationContext context) {
        Map<String, BuildState> finalists = new LinkedHashMap<>();
        neighborhoodSupport.retainApproximateBeam(candidates, context).stream()
                .limit(DIRECTED_FINALISTS)
                .forEach(state -> finalists.putIfAbsent(state.signature(), state));
        if (context.request().getMaximizeBonuses() != null) {
            for (DRIF_BONUS_TYPE type : context.request().getMaximizeBonuses()) {
                candidates.stream()
                        .max(
                                Comparator.comparingDouble(
                                        state -> stateEvaluator.currentValue(state, type, context)))
                        .ifPresent(state -> finalists.putIfAbsent(state.signature(), state));
            }
        }
        return new ArrayList<>(finalists.values());
    }
}
