package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search;

import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;

import java.util.Comparator;
import java.util.List;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.DrifOptimizationMath.fitsCapacity;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.*;

/** Performs deterministic replacement, swap, cap-consolidation, and penalty moves. */
@RequiredArgsConstructor
final class OptimizationDeterministicRefiner {

    private static final int MAX_REFINEMENT_ROUNDS = 3;
    private static final int MAX_PENALTY_REDUCTIONS = 100;
    private static final int BASE_REPLACEMENT_LEVEL = 6;
    private static final double MIN_ACCEPTED_GAIN = 0.0001;

    private final OptimizationStateOperations stateOperations;
    private final OptimizationLevelAllocator levelAllocator;
    private final OptimizationRequirementSatisfier requirementSatisfier;

    BuildState refine(BuildState state, OptimizationContext context) {
        for (int round = 0;
             round < MAX_REFINEMENT_ROUNDS
                     && !stateOperations.refinementBudgetExhausted(context);
             round++) {
            String before = state.signature();
            state = improveReplacements(state, context);
            state = improveSwaps(state, context);
            state = consolidateForcedTargets(state, context);
            state = reducePenalties(state, context);
            state = requirementSatisfier.removeRedundantForcedTargetDrifs(state, context);
            state = levelAllocator.allocateByPriority(state, context);
            if (before.equals(state.signature())) break;
        }
        return state;
    }

    private BuildState improveReplacements(BuildState state, OptimizationContext context) {
        for (int round = 0;
             round < MAX_REFINEMENT_ROUNDS
                     && !stateOperations.refinementBudgetExhausted(context);
             round++) {
            BuildState bestState = bestReplacement(state, context);
            if (bestState.signature().equals(state.signature())) break;
            state = bestState;
        }
        return state;
    }

    private BuildState bestReplacement(BuildState state, OptimizationContext context) {
        BuildState bestState = state;
        for (SlotContext slot : context.slots()) {
            if (stateOperations.refinementBudgetExhausted(context)) return state;
            if (!slot.optimizable() || stateOperations.isSlotLocked(slot, context)) continue;
            List<Placement> placements = state.slots().get(slot.key());
            for (int index = 0; index < placements.size(); index++) {
                if (stateOperations.refinementBudgetExhausted(context)) return state;
                Placement current = placements.get(index);
                if (!isMovable(current, slot, index)) continue;
                bestState = bestCandidateReplacement(
                        state, bestState, slot, placements, index, current, context);
            }
        }
        return bestState;
    }

    private BuildState bestCandidateReplacement(
            BuildState state, BuildState bestState, SlotContext slot,
            List<Placement> placements, int index, Placement current,
            OptimizationContext context) {
        for (DrifTemplate candidate : slot.candidates()) {
            if (stateOperations.refinementBudgetExhausted(context)) return state;
            if (!canReplace(state, placements, index, current, candidate, context)) continue;

            BuildState trial = state.copy();
            trial.setPlacement(slot.key(), index,
                    new Placement(candidate, baseLevel(candidate), false));
            levelAllocator.normalizeSlot(trial, slot, context);
            if (fitsCapacity(trial.slots().get(slot.key()), slot)
                    && stateOperations.minimumsSatisfied(trial, context)
                    && stateOperations.trySelectBetter(trial, bestState, context)) {
                bestState = trial;
            }
        }
        return bestState;
    }

    private boolean canReplace(
            BuildState state, List<Placement> placements, int index,
            Placement current, DrifTemplate candidate, OptimizationContext context) {
        return candidate.getBonusType() != current.drif().getBonusType()
                && !stateOperations.containsBonusExcept(
                placements, candidate.getBonusType(), index)
                && stateOperations.globalCountExcept(
                state, candidate.getBonusType(), current.drif().getBonusType(), context)
                < maxQuantity(candidate.getBonusType(), context.request())
                && !stateOperations.containsAnotherElemental(state, candidate, current.drif());
    }

    private BuildState improveSwaps(BuildState state, OptimizationContext context) {
        BuildState bestState = state;
        for (int first = 0; first < context.slots().size(); first++) {
            if (stateOperations.refinementBudgetExhausted(context)) return state;
            SlotContext firstSlot = context.slots().get(first);
            if (!firstSlot.optimizable() || stateOperations.isSlotLocked(firstSlot, context)) continue;
            for (int second = first + 1; second < context.slots().size(); second++) {
                if (stateOperations.refinementBudgetExhausted(context)) return state;
                SlotContext secondSlot = context.slots().get(second);
                if (!secondSlot.optimizable()
                        || stateOperations.isSlotLocked(secondSlot, context)) continue;
                bestState = bestSwapBetweenSlots(
                        state, bestState, firstSlot, secondSlot, context);
            }
        }
        return bestState;
    }

    private BuildState bestSwapBetweenSlots(
            BuildState state, BuildState bestState, SlotContext firstSlot,
            SlotContext secondSlot, OptimizationContext context) {
        List<Placement> firstPlacements = state.slots().get(firstSlot.key());
        List<Placement> secondPlacements = state.slots().get(secondSlot.key());
        for (int firstIndex = 0; firstIndex < firstPlacements.size(); firstIndex++) {
            if (stateOperations.refinementBudgetExhausted(context)) return state;
            Placement firstPlacement = firstPlacements.get(firstIndex);
            if (!isMovable(firstPlacement, firstSlot, firstIndex)) continue;
            for (int secondIndex = 0; secondIndex < secondPlacements.size(); secondIndex++) {
                if (stateOperations.refinementBudgetExhausted(context)) return state;
                Placement secondPlacement = secondPlacements.get(secondIndex);
                if (!isValidSwap(firstPlacements, secondPlacements,
                        firstSlot, secondSlot, firstIndex, secondIndex,
                        firstPlacement, secondPlacement)) continue;
                BuildState trial = swappedState(
                        state, firstSlot, secondSlot, firstIndex, secondIndex,
                        firstPlacement, secondPlacement, context);
                if (trial != null && stateOperations.minimumsSatisfied(trial, context)
                        && stateOperations.trySelectBetter(trial, bestState, context)) {
                    bestState = trial;
                }
            }
        }
        return bestState;
    }

    private boolean isValidSwap(
            List<Placement> firstPlacements, List<Placement> secondPlacements,
            SlotContext firstSlot, SlotContext secondSlot, int firstIndex, int secondIndex,
            Placement firstPlacement, Placement secondPlacement) {
        return isMovable(secondPlacement, secondSlot, secondIndex)
                && stateOperations.isValidForSlot(secondPlacement.drif(), firstSlot)
                && stateOperations.isValidForSlot(firstPlacement.drif(), secondSlot)
                && !stateOperations.containsBonusExcept(
                firstPlacements, secondPlacement.drif().getBonusType(), firstIndex)
                && !stateOperations.containsBonusExcept(
                secondPlacements, firstPlacement.drif().getBonusType(), secondIndex);
    }

    private BuildState swappedState(
            BuildState state, SlotContext firstSlot, SlotContext secondSlot,
            int firstIndex, int secondIndex, Placement firstPlacement,
            Placement secondPlacement, OptimizationContext context) {
        BuildState trial = state.copy();
        trial.setPlacement(firstSlot.key(), firstIndex,
                new Placement(secondPlacement.drif(), baseLevel(secondPlacement.drif()), false));
        trial.setPlacement(secondSlot.key(), secondIndex,
                new Placement(firstPlacement.drif(), baseLevel(firstPlacement.drif()), false));
        levelAllocator.normalizeSlot(trial, firstSlot, context);
        levelAllocator.normalizeSlot(trial, secondSlot, context);
        return fitsCapacity(trial.slots().get(firstSlot.key()), firstSlot)
                && fitsCapacity(trial.slots().get(secondSlot.key()), secondSlot)
                ? trial
                : null;
    }

    private BuildState consolidateForcedTargets(BuildState state,
                                                OptimizationContext context) {
        BuildState best = state;
        for (DRIF_BONUS_TYPE type : forcedTargetTypes(context)) {
            best = bestForcedTargetConsolidation(state, best, type, context);
            state = best;
        }
        return best;
    }

    private BuildState bestForcedTargetConsolidation(
            BuildState state, BuildState best, DRIF_BONUS_TYPE type,
            OptimizationContext context) {
        double target = targetFor(type, context.request());
        for (SlotContext source : context.slots()) {
            if (!source.optimizable() || stateOperations.isSlotLocked(source, context)) continue;
            List<Placement> sourcePlacements = state.slots().get(source.key());
            int sourceLimit = Math.min(sourcePlacements.size(), source.maxDrifs());
            for (int sourceIndex = 0; sourceIndex < sourceLimit; sourceIndex++) {
                Placement capPlacement = sourcePlacements.get(sourceIndex);
                if (!isMovableType(capPlacement, source, sourceIndex, type)) continue;
                best = bestRelocationForPlacement(
                        state, best, source, sourceIndex, capPlacement, type, target, context);
            }
        }
        return best;
    }

    private BuildState bestRelocationForPlacement(
            BuildState state, BuildState best, SlotContext source, int sourceIndex,
            Placement capPlacement, DRIF_BONUS_TYPE type, double target,
            OptimizationContext context) {
        for (SlotContext targetSlot : context.slots()) {
            if (targetSlot.drifBonus() <= source.drifBonus() + MIN_ACCEPTED_GAIN
                    || !targetSlot.optimizable()
                    || stateOperations.isSlotLocked(targetSlot, context)) continue;
            List<Placement> sourcePlacements = state.slots().get(source.key());
            List<Placement> targetPlacements = state.slots().get(targetSlot.key());
            int targetLimit = Math.min(targetPlacements.size(), targetSlot.maxDrifs());
            for (int targetIndex = 0; targetIndex < targetLimit; targetIndex++) {
                Placement other = targetPlacements.get(targetIndex);
                if (!isRelocationSwapAllowed(
                        sourcePlacements, targetPlacements, source, targetSlot,
                        sourceIndex, targetIndex, capPlacement, other, type)) continue;
                BuildState relocated = swappedState(
                        state, source, targetSlot, sourceIndex, targetIndex,
                        capPlacement, other, context);
                if (relocated != null) {
                    best = bestTargetRemoval(
                            relocated, best, targetSlot, targetIndex, type, target, context);
                }
            }
        }
        return best;
    }

    private boolean isRelocationSwapAllowed(
            List<Placement> sourcePlacements, List<Placement> targetPlacements,
            SlotContext source, SlotContext targetSlot, int sourceIndex, int targetIndex,
            Placement capPlacement, Placement other, DRIF_BONUS_TYPE type) {
        return isMovable(other, targetSlot, targetIndex)
                && other.drif().getBonusType() != type
                && stateOperations.isValidForSlot(capPlacement.drif(), targetSlot)
                && stateOperations.isValidForSlot(other.drif(), source)
                && !stateOperations.containsBonusExcept(
                sourcePlacements, other.drif().getBonusType(), sourceIndex)
                && !stateOperations.containsBonusExcept(
                targetPlacements, type, targetIndex);
    }

    private BuildState bestTargetRemoval(
            BuildState relocated, BuildState best, SlotContext targetSlot,
            int targetIndex, DRIF_BONUS_TYPE type, double target,
            OptimizationContext context) {
        for (SlotContext removalSlot : context.slots()) {
            List<Placement> placements = relocated.slots().get(removalSlot.key());
            int removalLimit = Math.min(placements.size(), removalSlot.maxDrifs());
            for (int removalIndex = 0; removalIndex < removalLimit; removalIndex++) {
                Placement removable = placements.get(removalIndex);
                if (!isRemovableDuplicateTarget(
                        removable, removalSlot, removalIndex,
                        targetSlot, targetIndex, type)) continue;

                BuildState trial = relocated.copy();
                trial.setPlacement(removalSlot.key(), removalIndex, null);
                levelAllocator.normalizeSlot(trial, removalSlot, context);
                if (stateOperations.minimumsSatisfied(trial, context)
                        && stateOperations.calculatedValue(trial, type, context)
                        >= target - TARGET_TOLERANCE
                        && stateOperations.trySelectBetter(trial, best, context)) {
                    best = trial;
                }
            }
        }
        return best;
    }

    private BuildState reducePenalties(BuildState state, OptimizationContext context) {
        boolean changed = true;
        int guard = 0;
        while (changed && guard++ < MAX_PENALTY_REDUCTIONS) {
            if (stateOperations.refinementBudgetExhausted(context)) return state;
            changed = false;
            for (SlotContext slot : context.slots()) {
                BuildState reduced = firstBeneficialRemoval(state, slot, context);
                if (reduced != state) {
                    state = reduced;
                    changed = true;
                    break;
                }
            }
        }
        return state;
    }

    private BuildState firstBeneficialRemoval(
            BuildState state, SlotContext slot, OptimizationContext context) {
        if (stateOperations.refinementBudgetExhausted(context)
                || !slot.optimizable() || stateOperations.isSlotLocked(slot, context)) return state;
        List<Placement> placements = state.slots().get(slot.key());
        for (int index = 0; index < placements.size(); index++) {
            if (stateOperations.refinementBudgetExhausted(context)) return state;
            Placement placement = placements.get(index);
            if (!isMovable(placement, slot, index)) continue;
            BuildState trial = state.copy();
            trial.setPlacement(slot.key(), index, null);
            levelAllocator.normalizeSlot(trial, slot, context);
            if (stateOperations.minimumsSatisfied(trial, context)
                    && stateOperations.trySelectBetter(trial, state, context)) return trial;
        }
        return state;
    }

    private boolean isMovable(Placement placement, SlotContext slot, int index) {
        return placement != null && !placement.locked()
                && !slot.lockedIndices().contains(index);
    }

    private boolean isMovableType(Placement placement, SlotContext slot, int index,
                                  DRIF_BONUS_TYPE type) {
        return isMovable(placement, slot, index)
                && placement.drif().getBonusType() == type;
    }

    private boolean isRemovableDuplicateTarget(
            Placement placement, SlotContext removalSlot, int removalIndex,
            SlotContext targetSlot, int targetIndex, DRIF_BONUS_TYPE type) {
        return isMovableType(placement, removalSlot, removalIndex, type)
                && !(removalSlot.key().equals(targetSlot.key())
                && removalIndex == targetIndex);
    }

    private List<DRIF_BONUS_TYPE> forcedTargetTypes(OptimizationContext context) {
        return context.request().getPriorities().keySet().stream()
                .filter(type -> isForcedTarget(type, context.request()))
                .sorted(Comparator.comparing(Enum::name))
                .toList();
    }

    private int baseLevel(DrifTemplate drif) {
        return Math.min(BASE_REPLACEMENT_LEVEL, drif.getSize().getMaxLevel());
    }
}
