package pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl;

import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;

import java.util.Comparator;
import java.util.List;
import java.util.Map;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl.DrifOptimizationMath.highestFittingLevel;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl.DrifOptimizationMath.lowestTierFittingLevel;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl.OptimizationRequestConstraints.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl.OptimizationSearchModel.*;

/** Places required drifs and repairs forced target constraints. */
@RequiredArgsConstructor
final class OptimizationRequirementSatisfier {

    private static final double MIN_ACCEPTED_GAIN = 0.0001;

    private final OptimizationStateOperations stateOperations;
    private final OptimizationLevelAllocator levelAllocator;

    boolean satisfyMinimums(BuildState state, OptimizationContext context) {
        while (true) {
            DRIF_BONUS_TYPE requiredType = mostConstrainedMissingType(state, context);
            if (requiredType == null) return stateOperations.minimumsSatisfied(state, context);

            RequiredPlacementChoice best = bestMinimumPlacement(state, requiredType, context);
            if (best == null) return false;
            stateOperations.putNextFree(state, best.slot(),
                    new Placement(best.drif(), best.level(), false));
        }
    }

    void satisfyForcedTargets(BuildState state, OptimizationContext context) {
        for (DRIF_BONUS_TYPE type : forcedTargetTypesByPriority(context)) {
            satisfyForcedTarget(state, type, context);
        }
    }

    BuildState removeRedundantForcedTargetDrifs(BuildState state,
                                                OptimizationContext context) {
        for (DRIF_BONUS_TYPE type : forcedTargetTypesByName(context)) {
            state = removeRedundantDrifsForTarget(state, type, context);
        }
        return state;
    }

    private DRIF_BONUS_TYPE mostConstrainedMissingType(BuildState state,
                                                       OptimizationContext context) {
        DRIF_BONUS_TYPE requiredType = null;
        int fewestOptions = Integer.MAX_VALUE;
        for (Map.Entry<DRIF_BONUS_TYPE, OptimizationRequest.QuantityRange> entry
                : context.sortedQuantities()) {
            int deficit = entry.getValue().getMin()
                    - stateOperations.globalCount(state, entry.getKey(), context);
            if (deficit <= 0) continue;

            int options = countFeasiblePlacements(state, entry.getKey(), context);
            if (options == 0) return entry.getKey();
            if (options < fewestOptions) {
                fewestOptions = options;
                requiredType = entry.getKey();
            }
        }
        return requiredType;
    }

    private RequiredPlacementChoice bestMinimumPlacement(
            BuildState state, DRIF_BONUS_TYPE requiredType, OptimizationContext context) {
        RequiredPlacementChoice best = null;
        for (SlotContext slot : context.slots()) {
            if (!canAddToSlot(state, slot, context)) continue;
            List<Placement> placements = state.slots.get(slot.key());
            for (DrifTemplate candidate : slot.candidates()) {
                if (!isMinimumCandidateAllowed(
                        state, placements, candidate, requiredType, context)) continue;

                Integer level = lowestTierFittingLevel(state, slot, candidate);
                if (level == null) continue;
                BuildState trial = state.copy();
                stateOperations.putNextFree(trial, slot,
                        new Placement(candidate, level, false));
                double gain = stateOperations.score(trial, context)
                        - stateOperations.score(state, context);
                if (isBetterChoice(slot, candidate, level, gain, best)) {
                    best = new RequiredPlacementChoice(slot, candidate, level, gain);
                }
            }
        }
        return best;
    }

    private boolean isMinimumCandidateAllowed(
            BuildState state, List<Placement> placements, DrifTemplate candidate,
            DRIF_BONUS_TYPE requiredType, OptimizationContext context) {
        return candidate.getBonusType() == requiredType
                && !stateOperations.containsBonus(placements, requiredType)
                && stateOperations.globalCount(state, requiredType, context)
                < maxQuantity(requiredType, context.request())
                && !stateOperations.containsAnotherElemental(state, candidate, null);
    }

    private int countFeasiblePlacements(BuildState state, DRIF_BONUS_TYPE type,
                                        OptimizationContext context) {
        int options = 0;
        for (SlotContext slot : context.slots()) {
            if (!canAddToSlot(state, slot, context)) continue;
            List<Placement> placements = state.slots.get(slot.key());
            if (stateOperations.containsBonus(placements, type)) continue;
            for (DrifTemplate candidate : slot.candidates()) {
                if (candidate.getBonusType() == type
                        && !stateOperations.containsAnotherElemental(state, candidate, null)
                        && highestFittingLevel(state, slot, candidate) != null) {
                    options++;
                    break;
                }
            }
        }
        return options;
    }

    private void satisfyForcedTarget(BuildState state, DRIF_BONUS_TYPE type,
                                     OptimizationContext context) {
        double target = targetFor(type, context.request());
        int guard = 0;
        while (stateOperations.calculatedValue(state, type, context) + TARGET_TOLERANCE < target
                && guard++ < MAX_GLOBAL_DRIFS_PER_TYPE) {
            RequiredPlacementChoice best = bestForcedTargetPlacement(state, type, target, context);
            if (best == null) return;
            stateOperations.putNextFree(state, best.slot(),
                    new Placement(best.drif(), best.level(), false));
        }
    }

    private RequiredPlacementChoice bestForcedTargetPlacement(
            BuildState state, DRIF_BONUS_TYPE type, double target,
            OptimizationContext context) {
        RequiredPlacementChoice best = null;
        double bestDistance = Double.POSITIVE_INFINITY;
        for (SlotContext slot : context.slots()) {
            if (!canAddToSlot(state, slot, context)) continue;
            List<Placement> placements = state.slots.get(slot.key());
            for (DrifTemplate candidate : slot.candidates()) {
                if (!isForcedTargetCandidateAllowed(
                        state, placements, candidate, type, context)) continue;
                Integer level = highestFittingLevel(state, slot, candidate);
                if (level == null) continue;

                BuildState trial = state.copy();
                stateOperations.putNextFree(trial, slot,
                        new Placement(candidate, level, false));
                double distance = targetDistance(
                        stateOperations.currentValue(trial, type, context), target);
                if (best == null || distance < bestDistance - MIN_ACCEPTED_GAIN
                        || (Math.abs(distance - bestDistance) <= MIN_ACCEPTED_GAIN
                        && isEarlierPlacement(slot, candidate, level, best))) {
                    bestDistance = distance;
                    best = new RequiredPlacementChoice(slot, candidate, level, -distance);
                }
            }
        }
        return best;
    }

    private boolean isForcedTargetCandidateAllowed(
            BuildState state, List<Placement> placements, DrifTemplate candidate,
            DRIF_BONUS_TYPE type, OptimizationContext context) {
        return candidate.getBonusType() == type
                && !stateOperations.containsBonus(placements, type)
                && stateOperations.globalCount(state, type, context)
                < maxQuantity(type, context.request())
                && !stateOperations.containsAnotherElemental(state, candidate, null);
    }

    private BuildState removeRedundantDrifsForTarget(
            BuildState state, DRIF_BONUS_TYPE type, OptimizationContext context) {
        double target = targetFor(type, context.request());
        boolean changed = true;
        while (changed && stateOperations.calculatedValue(state, type, context)
                >= target - TARGET_TOLERANCE) {
            changed = false;
            BuildState bestState = null;
            double bestExcess = Double.POSITIVE_INFINITY;
            for (SlotContext slot : context.slots()) {
                if (!slot.optimizable() || stateOperations.isSlotLocked(slot, context)) continue;
                List<Placement> placements = state.slots.get(slot.key());
                int placementLimit = Math.min(placements.size(), slot.maxDrifs());
                for (int index = 0; index < placementLimit; index++) {
                    Placement placement = placements.get(index);
                    if (!isRemovableTargetPlacement(placement, slot, index, type)) continue;

                    BuildState trial = state.copy();
                    trial.setPlacement(slot.key(), index, null);
                    levelAllocator.normalizeSlot(trial, slot, context);
                    if (!stateOperations.minimumsSatisfied(trial, context)) continue;
                    double trialValue = stateOperations.calculatedValue(trial, type, context);
                    if (trialValue < target - TARGET_TOLERANCE) continue;
                    double excess = trialValue - target;
                    if (bestState == null || excess < bestExcess - MIN_ACCEPTED_GAIN
                            || (Math.abs(excess - bestExcess) <= MIN_ACCEPTED_GAIN
                            && stateOperations.trySelectBetter(trial, bestState, context))) {
                        bestState = trial;
                        bestExcess = excess;
                    }
                }
            }
            if (bestState != null) {
                state = bestState;
                changed = true;
            }
        }
        return state;
    }

    private boolean canAddToSlot(BuildState state, SlotContext slot,
                                 OptimizationContext context) {
        return slot.optimizable()
                && !stateOperations.isSlotLocked(slot, context)
                && stateOperations.hasFreeDrifPosition(state.slots.get(slot.key()), slot);
    }

    private boolean isRemovableTargetPlacement(Placement placement, SlotContext slot,
                                               int index, DRIF_BONUS_TYPE type) {
        return placement != null && !placement.locked()
                && !slot.lockedIndices().contains(index)
                && placement.drif().getBonusType() == type;
    }

    private List<DRIF_BONUS_TYPE> forcedTargetTypesByPriority(OptimizationContext context) {
        return context.request().getPriorities().keySet().stream()
                .filter(type -> isForcedTarget(type, context.request()))
                .filter(type -> targetFor(type, context.request()) != null)
                .sorted(Comparator
                        .comparing((DRIF_BONUS_TYPE type) -> stateOperations.priorityOf(
                                type, context.request()), Comparator.reverseOrder())
                        .thenComparing(Enum::name))
                .toList();
    }

    private List<DRIF_BONUS_TYPE> forcedTargetTypesByName(OptimizationContext context) {
        return context.request().getPriorities().keySet().stream()
                .filter(type -> isForcedTarget(type, context.request()))
                .sorted(Comparator.comparing(Enum::name))
                .toList();
    }

    private boolean isBetterChoice(SlotContext slot, DrifTemplate candidate, int level,
                                   double gain, RequiredPlacementChoice current) {
        return current == null || gain > current.gain() + MIN_ACCEPTED_GAIN
                || (Math.abs(gain - current.gain()) <= MIN_ACCEPTED_GAIN
                && isEarlierPlacement(slot, candidate, level, current));
    }

    private boolean isEarlierPlacement(SlotContext slot, DrifTemplate candidate, int level,
                                       RequiredPlacementChoice current) {
        int slotComparison = slot.key().compareTo(current.slot().key());
        if (slotComparison != 0) return slotComparison < 0;
        int candidateComparison = Long.compare(candidate.getId(), current.drif().getId());
        if (candidateComparison != 0) return candidateComparison < 0;
        return level < current.level();
    }

    private double targetDistance(double value, double target) {
        return value < target ? target - value : (value - target) * 0.05;
    }
}
