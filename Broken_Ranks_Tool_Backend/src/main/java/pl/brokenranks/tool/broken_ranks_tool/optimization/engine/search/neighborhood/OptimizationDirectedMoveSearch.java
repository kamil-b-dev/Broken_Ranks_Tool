package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.neighborhood;

import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationStateEvaluator;

import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.DrifOptimizationMath.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.*;

/** Searches coordinated swaps that promote maximized drifs to stronger items. */
@RequiredArgsConstructor
final class OptimizationDirectedMoveSearch {

    private static final int DIRECTED_FINALISTS = 24;
    private static final int MAX_CAP_REPAIRS_PER_SWAP = 24;
    private static final int MAX_MINIMUM_REPAIRS_PER_CAP = 12;

    private final OptimizationStateEvaluator stateEvaluator;
    private final OptimizationActualStateComparator actualStateComparator;

    BuildState improve(BuildState current, OptimizationContext context,
                       OptimizationNeighborhoodSearchControl control) {
        List<BuildState> candidates = new ArrayList<>();
        candidates.add(current);
        List<SlotContext> slots = eligibleSlots(context);
        for (int lowIndex = 0; lowIndex < slots.size() && !control.exhausted(); lowIndex++) {
            for (int highIndex = slots.size() - 1;
                 highIndex > lowIndex && !control.exhausted(); highIndex--) {
                SlotContext low = slots.get(lowIndex);
                SlotContext high = slots.get(highIndex);
                if (high.drifBonus() > low.drifBonus()) {
                    addDirectedSwaps(current, low, high, context, control, candidates);
                }
            }
        }

        BuildState best = current;
        for (BuildState candidate : finalists(candidates, context)) {
            control.rememberEvaluated(candidate);
            if (!candidate.signature().equals(best.signature())
                    && actualStateComparator.isBetter(candidate, best, context)) {
                best = candidate;
            }
        }
        return best;
    }

    private List<SlotContext> eligibleSlots(OptimizationContext context) {
        return context.slots().stream()
                .filter(SlotContext::optimizable)
                .filter(slot -> !isSlotLocked(slot, context))
                .sorted(Comparator.comparingDouble(SlotContext::drifBonus))
                .toList();
    }

    private List<BuildState> finalists(List<BuildState> candidates,
                                       OptimizationContext context) {
        Map<String, BuildState> finalists = new LinkedHashMap<>();
        retainApproximateBeam(candidates, context).stream()
                .limit(DIRECTED_FINALISTS)
                .forEach(state -> finalists.putIfAbsent(state.signature(), state));
        if (context.request().getMaximizeBonuses() != null) {
            for (DRIF_BONUS_TYPE type : context.request().getMaximizeBonuses()) {
                candidates.stream()
                        .max(Comparator.comparingDouble(
                                state -> stateEvaluator.currentValue(state, type, context)))
                        .ifPresent(state -> finalists.putIfAbsent(state.signature(), state));
            }
        }
        return new ArrayList<>(finalists.values());
    }

    private void addDirectedSwaps(
            BuildState state, SlotContext low, SlotContext high,
            OptimizationContext context, OptimizationNeighborhoodSearchControl control,
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
                BuildState trial = directedSwap(state, low, high, lowPosition,
                        highPosition, promoted, displaced, context);
                if (trial == null) continue;
                candidates.add(trial);
                if (displaced != null
                        && isForcedTarget(displaced.drif().getBonusType(), context.request())) {
                    addForcedTargetRepairs(trial, displaced.drif().getBonusType(),
                            context, control, candidates);
                }
            }
        }
    }

    private BuildState directedSwap(
            BuildState state, SlotContext low, SlotContext high,
            int lowPosition, int highPosition, Placement promoted, Placement displaced,
            OptimizationContext context) {
        if (!isMovable(displaced, high, highPosition) || !accepts(high, promoted)
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

    private void addForcedTargetRepairs(
            BuildState state, DRIF_BONUS_TYPE targetType, OptimizationContext context,
            OptimizationNeighborhoodSearchControl control, List<BuildState> candidates) {
        if (stateEvaluator.globalCount(state, targetType, context)
                >= maxQuantity(targetType, context.request())) return;
        int repairs = 0;
        for (SlotContext slot : context.slots()) {
            if (repairs >= MAX_CAP_REPAIRS_PER_SWAP || control.exhausted()) return;
            if (!slot.optimizable() || isSlotLocked(slot, context)) continue;
            DrifTemplate targetDrif = candidateForType(slot, targetType);
            if (targetDrif == null) continue;
            List<Placement> placements = state.slots().get(slot.key());
            if (containsBonusExcept(placements, targetType, -1)) continue;
            repairs += addTargetRepairsInSlot(state, slot, targetDrif, placements,
                    context, control, candidates,
                    MAX_CAP_REPAIRS_PER_SWAP - repairs);
        }
    }

    private int addTargetRepairsInSlot(
            BuildState state, SlotContext slot, DrifTemplate targetDrif,
            List<Placement> placements, OptimizationContext context,
            OptimizationNeighborhoodSearchControl control, List<BuildState> candidates,
            int remainingRepairs) {
        int repairs = 0;
        int limit = Math.min(slot.maxDrifs(), placements.size());
        for (int position = 0; position < limit && repairs < remainingRepairs; position++) {
            Placement removed = placements.get(position);
            if (!isReplaceableOptional(removed, slot, position, context)) continue;
            for (Integer level : fittingLevels(placements, slot, targetDrif, position)) {
                if (!control.tryConsume()) return repairs;
                BuildState repaired = state.copy();
                repaired.setPlacement(slot.key(), position,
                        new Placement(targetDrif, level, false));
                if (!fitsCapacity(repaired.slots().get(slot.key()), slot)) continue;
                repairs++;
                if (stateEvaluator.minimumsSatisfied(repaired, context)) {
                    candidates.add(repaired);
                } else if (removed != null) {
                    addMinimumRepairs(repaired, removed, slot.key(),
                            context, control, candidates);
                }
                if (repairs >= remainingRepairs) return repairs;
            }
        }
        return repairs;
    }

    private void addMinimumRepairs(
            BuildState state, Placement missing, String excludedSlotKey,
            OptimizationContext context, OptimizationNeighborhoodSearchControl control,
            List<BuildState> candidates) {
        int repairs = 0;
        for (SlotContext slot : context.slots()) {
            if (repairs >= MAX_MINIMUM_REPAIRS_PER_CAP || control.exhausted()) return;
            if (!acceptsMinimumRepairSlot(slot, missing, excludedSlotKey, context)) continue;
            List<Placement> placements = state.slots().get(slot.key());
            if (containsBonusExcept(placements, missing.drif().getBonusType(), -1)) continue;
            repairs += addMinimumRepairsInSlot(state, slot, missing, placements,
                    context, control, candidates,
                    MAX_MINIMUM_REPAIRS_PER_CAP - repairs);
        }
    }

    private int addMinimumRepairsInSlot(
            BuildState state, SlotContext slot, Placement missing,
            List<Placement> placements, OptimizationContext context,
            OptimizationNeighborhoodSearchControl control, List<BuildState> candidates,
            int remainingRepairs) {
        int repairs = 0;
        int limit = Math.min(slot.maxDrifs(), placements.size());
        for (int position = 0; position < limit && repairs < remainingRepairs; position++) {
            Placement victim = placements.get(position);
            if (!isReplaceableOptional(victim, slot, position, context)) continue;
            for (Integer level : fittingLevels(placements, slot, missing.drif(), position)) {
                if (!control.tryConsume()) return repairs;
                BuildState repaired = state.copy();
                repaired.setPlacement(slot.key(), position,
                        new Placement(missing.drif(), level, false));
                if (fitsCapacity(repaired.slots().get(slot.key()), slot)
                        && stateEvaluator.minimumsSatisfied(repaired, context)) {
                    candidates.add(repaired);
                    repairs++;
                    if (repairs >= remainingRepairs) return repairs;
                }
            }
        }
        return repairs;
    }

    private boolean acceptsMinimumRepairSlot(
            SlotContext slot, Placement missing, String excludedSlotKey,
            OptimizationContext context) {
        return !slot.key().equals(excludedSlotKey) && slot.optimizable()
                && !isSlotLocked(slot, context) && accepts(slot, missing);
    }

    private boolean isReplaceableOptional(
            Placement placement, SlotContext slot, int position,
            OptimizationContext context) {
        return isMovable(placement, slot, position)
                && (placement == null
                || !isForcedTarget(placement.drif().getBonusType(), context.request())
                && !isMaximized(placement.drif().getBonusType(), context.request()));
    }

    private boolean isMovableMaximized(Placement placement, SlotContext slot, int position,
                                       OptimizationContext context) {
        return isMovable(placement, slot, position) && placement != null
                && isMaximized(placement.drif().getBonusType(), context.request());
    }

    private boolean isMovable(Placement placement, SlotContext slot, int position) {
        return !slot.lockedIndices().contains(position)
                && (placement == null || !placement.locked());
    }

    private boolean accepts(SlotContext slot, Placement placement) {
        return slot.candidates().stream()
                .anyMatch(candidate -> candidate.getId().equals(placement.drif().getId()));
    }

    private DrifTemplate candidateForType(SlotContext slot, DRIF_BONUS_TYPE type) {
        return slot.candidates().stream()
                .filter(candidate -> candidate.getBonusType() == type)
                .findFirst()
                .orElse(null);
    }

    private boolean hasDuplicateBonuses(List<Placement> placements) {
        Set<DRIF_BONUS_TYPE> types = new java.util.HashSet<>();
        for (Placement placement : placements) {
            if (placement != null && !types.add(placement.drif().getBonusType())) return true;
        }
        return false;
    }

    private List<Integer> fittingLevels(List<Placement> placements, SlotContext slot,
                                        DrifTemplate candidate, int replacedIndex) {
        int availablePower = slot.capacity() - usedPowerExcept(placements, replacedIndex);
        if (availablePower < candidate.getBonusType().getBasePower()) return List.of();
        int highest = highestLevelForPower(candidate, availablePower);
        Set<Integer> levels = new TreeSet<>(Comparator.reverseOrder());
        levels.add(highest);
        for (int level : List.of(6, 11, 16, 21)) {
            if (level <= highest && level <= candidate.getSize().getMaxLevel()) levels.add(level);
        }
        return new ArrayList<>(levels);
    }

    private List<BuildState> retainApproximateBeam(List<BuildState> states,
                                                    OptimizationContext context) {
        Map<String, BuildState> unique = new LinkedHashMap<>();
        states.forEach(state -> unique.putIfAbsent(state.signature(), state));
        List<BuildState> retained = new ArrayList<>(unique.values());
        retained.sort((left, right) -> compareApproximate(left, right, context));
        return retained;
    }

    private int compareApproximate(BuildState left, BuildState right,
                                   OptimizationContext context) {
        if (hasMaximizedTypes(context)) {
            boolean leftBetter = stateEvaluator.isBetterMaximizationState(left, right, context);
            boolean rightBetter = stateEvaluator.isBetterMaximizationState(right, left, context);
            if (leftBetter != rightBetter) return leftBetter ? -1 : 1;
        }
        return stateEvaluator.stateComparator(context).compare(left, right);
    }

    private boolean containsBonusExcept(List<Placement> placements,
                                        DRIF_BONUS_TYPE type, int ignoredIndex) {
        for (int index = 0; index < placements.size(); index++) {
            if (index != ignoredIndex && placements.get(index) != null
                    && placements.get(index).drif().getBonusType() == type) return true;
        }
        return false;
    }

    private boolean isSlotLocked(SlotContext slot, OptimizationContext context) {
        return context.request().getLockedSlots() != null
                && context.request().getLockedSlots().contains(slot.key());
    }

    private boolean hasMaximizedTypes(OptimizationContext context) {
        return context.request().getMaximizeBonuses() != null
                && !context.request().getMaximizeBonuses().isEmpty();
    }
}
