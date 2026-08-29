package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.requirement;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints.*;

import java.util.Comparator;
import java.util.List;
import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.evaluation.OptimizationStateEvaluation;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.level.OptimizationLevelAllocator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.placement.OptimizationPlacementOperations;

/** Removes redundant target drifs without violating minimums or the forced target. */
@RequiredArgsConstructor
final class RedundantForcedTargetDrifRemover {
    private static final double MIN_GAIN = 0.0001;
    private final OptimizationPlacementOperations placements;
    private final OptimizationStateEvaluation evaluation;
    private final OptimizationLevelAllocator levels;
    private final OptimizationRequirementSupport support;

    BuildState remove(BuildState state, OptimizationContext context) {
        for (DRIF_BONUS_TYPE type : forcedTypes(context)) state = remove(state, type, context);
        return state;
    }

    private BuildState remove(BuildState state, DRIF_BONUS_TYPE type, OptimizationContext context) {
        double target = targetFor(type, context.request());
        boolean changed = true;
        while (changed
                && evaluation.calculatedValue(state, type, context) >= target - TARGET_TOLERANCE) {
            changed = false;
            BuildState best = null;
            double bestExcess = Double.POSITIVE_INFINITY;
            for (SlotContext slot : context.slots()) {
                if (!slot.optimizable() || placements.isSlotLocked(slot, context)) continue;
                List<Placement> placements = state.slots().get(slot.key());
                for (int index = 0; index < Math.min(placements.size(), slot.maxDrifs()); index++) {
                    Placement placement = placements.get(index);
                    if (!support.movable(placement, slot, index)
                            || placement.drif().getBonusType() != type) continue;
                    BuildState trial = state.copy();
                    trial.setPlacement(slot.key(), index, null);
                    levels.normalizeSlot(trial, slot, context);
                    if (!evaluation.minimumsSatisfied(trial, context)) continue;
                    double value = evaluation.calculatedValue(trial, type, context);
                    if (value < target - TARGET_TOLERANCE) continue;
                    double excess = value - target;
                    if (best == null
                            || excess < bestExcess - MIN_GAIN
                            || (Math.abs(excess - bestExcess) <= MIN_GAIN
                                    && evaluation.trySelectBetter(trial, best, context))) {
                        best = trial;
                        bestExcess = excess;
                    }
                }
            }
            if (best != null) {
                state = best;
                changed = true;
            }
        }
        return state;
    }

    private List<DRIF_BONUS_TYPE> forcedTypes(OptimizationContext context) {
        return context.request().getPriorities().keySet().stream()
                .filter(type -> isForcedTarget(type, context.request()))
                .sorted(Comparator.comparing(Enum::name))
                .toList();
    }
}
