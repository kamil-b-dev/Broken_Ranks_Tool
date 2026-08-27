package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.DrifOptimizationMath.fitsCapacity;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints.*;

import java.util.Comparator;
import java.util.List;
import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;

/** Reorganizes placements between slots to improve swaps and forced targets. */
@RequiredArgsConstructor
final class OptimizationPlacementReorganizationStrategy implements DeterministicRefinementStrategy {
    private static final int BASE_REPLACEMENT_LEVEL = 6;
    private static final double MIN_ACCEPTED_GAIN = 0.0001;
    private final OptimizationStateOperations stateOperations;
    private final OptimizationLevelAllocator levelAllocator;

    @Override
    public BuildState refine(BuildState state, OptimizationContext context) {
        state = improveSwaps(state, context);
        return consolidateForcedTargets(state, context);
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

    private BuildState consolidateForcedTargets(BuildState state, OptimizationContext context) {
        BuildState best = state;
        for (DRIF_BONUS_TYPE type : forcedTypes(context)) {
            best = consolidate(state, best, type, context);
            state = best;
        }
        return best;
    }

    private BuildState consolidate(
            BuildState state, BuildState best, DRIF_BONUS_TYPE type, OptimizationContext context) {
        double target = targetFor(type, context.request());
        for (SlotContext source : context.slots()) {
            if (!source.optimizable() || stateOperations.isSlotLocked(source, context)) continue;
            List<Placement> placements = state.slots().get(source.key());
            for (int index = 0; index < Math.min(placements.size(), source.maxDrifs()); index++) {
                Placement cap = placements.get(index);
                if (!movableType(cap, source, index, type)) continue;
                best = relocate(state, best, source, index, cap, type, target, context);
            }
        }
        return best;
    }

    private BuildState relocate(
            BuildState state,
            BuildState best,
            SlotContext source,
            int sourceIndex,
            Placement cap,
            DRIF_BONUS_TYPE type,
            double target,
            OptimizationContext context) {
        for (SlotContext destination : context.slots()) {
            if (destination.drifBonus() <= source.drifBonus() + MIN_ACCEPTED_GAIN
                    || !destination.optimizable()
                    || stateOperations.isSlotLocked(destination, context)) continue;
            List<Placement> sourceValues = state.slots().get(source.key());
            List<Placement> targetValues = state.slots().get(destination.key());
            for (int targetIndex = 0;
                    targetIndex < Math.min(targetValues.size(), destination.maxDrifs());
                    targetIndex++) {
                Placement other = targetValues.get(targetIndex);
                if (!movable(other, destination, targetIndex)
                        || other.drif().getBonusType() == type
                        || !stateOperations.isValidForSlot(cap.drif(), destination)
                        || !stateOperations.isValidForSlot(other.drif(), source)
                        || stateOperations.containsBonusExcept(
                                sourceValues, other.drif().getBonusType(), sourceIndex)
                        || stateOperations.containsBonusExcept(targetValues, type, targetIndex))
                    continue;
                BuildState moved =
                        swapped(
                                state,
                                source,
                                destination,
                                sourceIndex,
                                targetIndex,
                                cap,
                                other,
                                context);
                if (moved != null)
                    best =
                            removeDuplicate(
                                    moved, best, destination, targetIndex, type, target, context);
            }
        }
        return best;
    }

    private BuildState removeDuplicate(
            BuildState moved,
            BuildState best,
            SlotContext destination,
            int destinationIndex,
            DRIF_BONUS_TYPE type,
            double target,
            OptimizationContext context) {
        for (SlotContext slot : context.slots()) {
            List<Placement> values = moved.slots().get(slot.key());
            for (int index = 0; index < Math.min(values.size(), slot.maxDrifs()); index++) {
                Placement value = values.get(index);
                if (!movableType(value, slot, index, type)
                        || (slot.key().equals(destination.key()) && index == destinationIndex))
                    continue;
                BuildState trial = moved.copy();
                trial.setPlacement(slot.key(), index, null);
                levelAllocator.normalizeSlot(trial, slot, context);
                if (stateOperations.minimumsSatisfied(trial, context)
                        && stateOperations.calculatedValue(trial, type, context)
                                >= target - TARGET_TOLERANCE
                        && stateOperations.trySelectBetter(trial, best, context)) best = trial;
            }
        }
        return best;
    }

    private boolean movable(Placement value, SlotContext slot, int index) {
        return value != null && !value.locked() && !slot.lockedIndices().contains(index);
    }

    private boolean movableType(
            Placement value, SlotContext slot, int index, DRIF_BONUS_TYPE type) {
        return movable(value, slot, index) && value.drif().getBonusType() == type;
    }

    private List<DRIF_BONUS_TYPE> forcedTypes(OptimizationContext context) {
        return context.request().getPriorities().keySet().stream()
                .filter(type -> isForcedTarget(type, context.request()))
                .sorted(Comparator.comparing(Enum::name))
                .toList();
    }

    private int baseLevel(DrifTemplate drif) {
        return Math.min(BASE_REPLACEMENT_LEVEL, drif.getSize().getMaxLevel());
    }
}
