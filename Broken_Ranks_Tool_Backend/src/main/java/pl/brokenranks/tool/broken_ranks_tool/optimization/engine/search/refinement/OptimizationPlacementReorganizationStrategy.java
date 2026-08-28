package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.refinement;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.DrifOptimizationMath.fitsCapacity;

import java.util.List;
import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.OptimizationLevelAllocator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.OptimizationStateOperations;

/** Reorganizes placements between slots to improve swaps and forced targets. */
@RequiredArgsConstructor
final class OptimizationPlacementReorganizationStrategy implements DeterministicRefinementStrategy {
    private static final int BASE_REPLACEMENT_LEVEL = 6;
    private final OptimizationStateOperations stateOperations;
    private final OptimizationLevelAllocator levelAllocator;

    @Override
    public BuildState refine(BuildState state, OptimizationContext context) {
        return improveSwaps(state, context);
    }

    private BuildState improveSwaps(BuildState state, OptimizationContext context) {
        BuildState bestState = state;
        for (int first = 0; first < context.slots().size(); first++) {
            if (stateOperations.refinementBudgetExhausted(context)) return state;
            SlotContext firstSlot = context.slots().get(first);
            if (!firstSlot.optimizable() || stateOperations.isSlotLocked(firstSlot, context))
                continue;
            for (int second = first + 1; second < context.slots().size(); second++) {
                SlotContext secondSlot = context.slots().get(second);
                if (!secondSlot.optimizable() || stateOperations.isSlotLocked(secondSlot, context))
                    continue;
                bestState = bestSwap(state, bestState, firstSlot, secondSlot, context);
            }
        }
        return bestState;
    }

    private BuildState bestSwap(
            BuildState state,
            BuildState best,
            SlotContext firstSlot,
            SlotContext secondSlot,
            OptimizationContext context) {
        List<Placement> first = state.slots().get(firstSlot.key());
        List<Placement> second = state.slots().get(secondSlot.key());
        for (int i = 0; i < first.size(); i++)
            for (int j = 0; j < second.size(); j++) {
                Placement left = first.get(i);
                Placement right = second.get(j);
                if (!validSwap(first, second, firstSlot, secondSlot, i, j, left, right)) continue;
                BuildState trial =
                        swapped(state, firstSlot, secondSlot, i, j, left, right, context);
                if (trial != null
                        && stateOperations.minimumsSatisfied(trial, context)
                        && stateOperations.trySelectBetter(trial, best, context)) best = trial;
            }
        return best;
    }

    private boolean validSwap(
            List<Placement> first,
            List<Placement> second,
            SlotContext firstSlot,
            SlotContext secondSlot,
            int i,
            int j,
            Placement left,
            Placement right) {
        return movable(left, firstSlot, i)
                && movable(right, secondSlot, j)
                && stateOperations.isValidForSlot(right.drif(), firstSlot)
                && stateOperations.isValidForSlot(left.drif(), secondSlot)
                && !stateOperations.containsBonusExcept(first, right.drif().getBonusType(), i)
                && !stateOperations.containsBonusExcept(second, left.drif().getBonusType(), j);
    }

    private BuildState swapped(
            BuildState state,
            SlotContext first,
            SlotContext second,
            int i,
            int j,
            Placement left,
            Placement right,
            OptimizationContext context) {
        BuildState trial = state.copy();
        trial.setPlacement(
                first.key(), i, new Placement(right.drif(), baseLevel(right.drif()), false));
        trial.setPlacement(
                second.key(), j, new Placement(left.drif(), baseLevel(left.drif()), false));
        levelAllocator.normalizeSlot(trial, first, context);
        levelAllocator.normalizeSlot(trial, second, context);
        return fitsCapacity(trial.slots().get(first.key()), first)
                        && fitsCapacity(trial.slots().get(second.key()), second)
                ? trial
                : null;
    }

    private boolean movable(Placement value, SlotContext slot, int index) {
        return value != null && !value.locked() && !slot.lockedIndices().contains(index);
    }

    private int baseLevel(DrifTemplate drif) {
        return Math.min(BASE_REPLACEMENT_LEVEL, drif.getSize().getMaxLevel());
    }
}
