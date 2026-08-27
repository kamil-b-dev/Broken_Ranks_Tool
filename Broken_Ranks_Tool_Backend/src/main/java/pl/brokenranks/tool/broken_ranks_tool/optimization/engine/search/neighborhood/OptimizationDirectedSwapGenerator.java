package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.neighborhood;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.DrifOptimizationMath.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints.*;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationStateEvaluator;

/** Generates swaps that promote maximized drifs to stronger equipment slots. */
@RequiredArgsConstructor
final class OptimizationDirectedSwapGenerator {
    private final OptimizationStateEvaluator stateEvaluator;
    private final OptimizationNeighborhoodSupport neighborhoodSupport;
    private final OptimizationForcedTargetRepairGenerator forcedTargetRepairGenerator;

    void addCandidates(
            BuildState state,
            SlotContext low,
            SlotContext high,
            OptimizationContext context,
            OptimizationNeighborhoodSearchControl control,
            List<BuildState> candidates) {
        List<Placement> lowPlacements = state.slots().get(low.key());
        List<Placement> highPlacements = state.slots().get(high.key());
        int lowLimit = Math.min(low.maxDrifs(), lowPlacements.size());
        int highLimit = Math.min(high.maxDrifs(), highPlacements.size());
        for (int lowPosition = 0; lowPosition < lowLimit; lowPosition++) {
            Placement promoted = lowPlacements.get(lowPosition);
            if (!isMovableMaximized(promoted, low, lowPosition, context)) continue;
            for (int highPosition = 0; highPosition < highLimit; highPosition++) {
                if (!control.tryConsume()) return;
                Placement displaced = highPlacements.get(highPosition);
                BuildState trial =
                        directedSwap(
                                state,
                                low,
                                high,
                                lowPosition,
                                highPosition,
                                promoted,
                                displaced,
                                context);
                if (trial == null) continue;
                candidates.add(trial);
                if (displaced != null
                        && isForcedTarget(displaced.drif().getBonusType(), context.request())) {
                    forcedTargetRepairGenerator.addCandidates(
                            trial, displaced.drif().getBonusType(), context, control, candidates);
                }
            }
        }
    }

    private BuildState directedSwap(
            BuildState state,
            SlotContext low,
            SlotContext high,
            int lowPosition,
            int highPosition,
            Placement promoted,
            Placement displaced,
            OptimizationContext context) {
        if (!neighborhoodSupport.isMovable(displaced, high, highPosition)
                || !accepts(high, promoted)
                || (displaced != null && !accepts(low, displaced))) return null;
        BuildState trial = state.copy();
        trial.setPlacement(low.key(), lowPosition, displaced);
        trial.setPlacement(high.key(), highPosition, promoted);
        return !hasDuplicateBonuses(trial.slots().get(low.key()))
                        && !hasDuplicateBonuses(trial.slots().get(high.key()))
                        && fitsCapacity(trial.slots().get(low.key()), low)
                        && fitsCapacity(trial.slots().get(high.key()), high)
                        && stateEvaluator.minimumsSatisfied(trial, context)
                ? trial
                : null;
    }

    private boolean isMovableMaximized(
            Placement placement, SlotContext slot, int position, OptimizationContext context) {
        return neighborhoodSupport.isMovable(placement, slot, position)
                && placement != null
                && isMaximized(placement.drif().getBonusType(), context.request());
    }

    private boolean accepts(SlotContext slot, Placement placement) {
        return slot.candidates().stream()
                .anyMatch(candidate -> candidate.getId().equals(placement.drif().getId()));
    }

    private boolean hasDuplicateBonuses(List<Placement> placements) {
        Set<DRIF_BONUS_TYPE> types = new HashSet<>();
        for (Placement placement : placements) {
            if (placement != null && !types.add(placement.drif().getBonusType())) return true;
        }
        return false;
    }
}
