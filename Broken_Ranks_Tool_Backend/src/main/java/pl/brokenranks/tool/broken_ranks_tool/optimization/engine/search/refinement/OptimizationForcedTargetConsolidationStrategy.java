package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.refinement;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.DrifOptimizationMath.fitsCapacity;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints.*;

import java.util.Comparator;
import java.util.List;
import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.OptimizationLevelAllocator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.OptimizationStateOperations;

/** Consolidates forced-target placements onto slots with stronger drif bonuses. */
@RequiredArgsConstructor
final class OptimizationForcedTargetConsolidationStrategy
        implements DeterministicRefinementStrategy {
    private static final int BASE_REPLACEMENT_LEVEL = 6;
    private static final double MIN_ACCEPTED_GAIN = 0.0001;
    private final OptimizationStateOperations stateOperations;
    private final OptimizationLevelAllocator levelAllocator;

    @Override
    public BuildState refine(BuildState state, OptimizationContext context) {
        BuildState best = state;
        for (DRIF_BONUS_TYPE type : forcedTypes(context)) {
            best = consolidate(best, type, context);
        }
        return best;
    }

    private BuildState consolidate(
            BuildState state, DRIF_BONUS_TYPE type, OptimizationContext context) {
        BuildState best = state;
        double target = targetFor(type, context.request());
        for (SlotContext source : context.slots()) {
            if (!source.optimizable() || stateOperations.isSlotLocked(source, context)) continue;
            List<Placement> placements = state.slots().get(source.key());
            for (int index = 0; index < Math.min(placements.size(), source.maxDrifs()); index++) {
                Placement cap = placements.get(index);
                if (movableType(cap, source, index, type)) {
                    best = relocate(state, best, source, index, cap, type, target, context);
                }
            }
        }
        return best;
    }

    private BuildState relocate(
            BuildState state, BuildState best, SlotContext source, int sourceIndex,
            Placement cap, DRIF_BONUS_TYPE type, double target, OptimizationContext context) {
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
                if (!validMove(sourceValues, targetValues, source, destination, sourceIndex,
                        targetIndex, cap, other, type)) continue;
                BuildState moved = swapped(state, source, destination, sourceIndex, targetIndex,
                        cap, other, context);
                if (moved != null) {
                    best = removeDuplicate(moved, best, destination, targetIndex, type, target, context);
                }
            }
        }
        return best;
    }

    private boolean validMove(
            List<Placement> sourceValues, List<Placement> targetValues, SlotContext source,
            SlotContext destination, int sourceIndex, int targetIndex, Placement cap,
            Placement other, DRIF_BONUS_TYPE type) {
        return movable(other, destination, targetIndex)
                && other.drif().getBonusType() != type
                && stateOperations.isValidForSlot(cap.drif(), destination)
                && stateOperations.isValidForSlot(other.drif(), source)
                && !stateOperations.containsBonusExcept(
                        sourceValues, other.drif().getBonusType(), sourceIndex)
                && !stateOperations.containsBonusExcept(targetValues, type, targetIndex);
    }

    private BuildState swapped(
            BuildState state, SlotContext first, SlotContext second, int firstIndex,
            int secondIndex, Placement left, Placement right, OptimizationContext context) {
        BuildState trial = state.copy();
        trial.setPlacement(first.key(), firstIndex,
                new Placement(right.drif(), baseLevel(right.drif()), false));
        trial.setPlacement(second.key(), secondIndex,
                new Placement(left.drif(), baseLevel(left.drif()), false));
        levelAllocator.normalizeSlot(trial, first, context);
        levelAllocator.normalizeSlot(trial, second, context);
        return fitsCapacity(trial.slots().get(first.key()), first)
                        && fitsCapacity(trial.slots().get(second.key()), second)
                ? trial : null;
    }

    private BuildState removeDuplicate(
            BuildState moved, BuildState best, SlotContext destination, int destinationIndex,
            DRIF_BONUS_TYPE type, double target, OptimizationContext context) {
        for (SlotContext slot : context.slots()) {
            List<Placement> values = moved.slots().get(slot.key());
            for (int index = 0; index < Math.min(values.size(), slot.maxDrifs()); index++) {
                Placement value = values.get(index);
                if (!movableType(value, slot, index, type)
                        || (slot.key().equals(destination.key()) && index == destinationIndex)) continue;
                BuildState trial = moved.copy();
                trial.setPlacement(slot.key(), index, null);
                levelAllocator.normalizeSlot(trial, slot, context);
                if (stateOperations.minimumsSatisfied(trial, context)
                        && stateOperations.calculatedValue(trial, type, context) >= target - TARGET_TOLERANCE
                        && stateOperations.trySelectBetter(trial, best, context)) best = trial;
            }
        }
        return best;
    }

    private boolean movable(Placement value, SlotContext slot, int index) {
        return value != null && !value.locked() && !slot.lockedIndices().contains(index);
    }

    private boolean movableType(Placement value, SlotContext slot, int index, DRIF_BONUS_TYPE type) {
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
