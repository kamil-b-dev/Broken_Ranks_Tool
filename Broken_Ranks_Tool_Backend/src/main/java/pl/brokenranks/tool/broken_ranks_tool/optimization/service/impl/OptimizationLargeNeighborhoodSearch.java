package pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl;

import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl.DrifOptimizationMath.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl.OptimizationRequestConstraints.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl.OptimizationSearchModel.*;

/**
 * Performs a bounded large-neighborhood search after the main optimizer.
 * Each neighborhood rebuilds one position in up to three equipment slots,
 * allowing coordinated changes that single replacements cannot reach.
 */
@RequiredArgsConstructor
final class OptimizationLargeNeighborhoodSearch {

    private static final int MAX_GENERATED_STATES = 40_000;
    private static final int GROUP_BEAM_WIDTH = 24;
    private static final int ACTUAL_FINALISTS_PER_GROUP = 4;
    private static final int DIRECTED_FINALISTS = 24;
    private static final int MAX_CAP_REPAIRS_PER_SWAP = 24;
    private static final int MAX_MINIMUM_REPAIRS_PER_CAP = 12;
    private static final int MAX_ROUNDS = 2;
    private static final double MIN_ACTUAL_GAIN = 0.000_001;

    private final EquipmentRulesRegistry rules;
    private final OptimizationStateEvaluator stateEvaluator;
    private final OptimizationResultAssembler resultAssembler;

    /** Returns the best state and calculator-verified alternatives visited during the search. */
    SearchResult improve(BuildState initial, OptimizationContext context) {
        SearchControl control = new SearchControl(MAX_GENERATED_STATES);
        control.rememberEvaluated(initial);
        BuildState best = improveDirectedMoves(initial, context, control);
        List<List<SlotContext>> groups = buildGroups(context.slots());

        for (int round = 0; round < MAX_ROUNDS && !control.exhausted(); round++) {
            String before = best.signature();
            for (List<SlotContext> group : groups) {
                if (control.exhausted()) break;
                best = improveGroup(best, group, context, control);
            }
            if (before.equals(best.signature())) break;
        }
        return new SearchResult(best, control.evaluatedStates());
    }

    /**
     * Evaluates atomic relocations and swaps that move maximized modifiers towards
     * items with a higher drif bonus. The move is validated only after both sides
     * are changed, so quantity minimums do not block a valid coordinated swap.
     */
    private BuildState improveDirectedMoves(BuildState current, OptimizationContext context,
                                            SearchControl control) {
        List<BuildState> candidates = new ArrayList<>();
        candidates.add(current);
        List<SlotContext> slots = context.slots().stream()
                .filter(SlotContext::optimizable)
                .filter(slot -> !isSlotLocked(slot, context))
                .sorted(Comparator.comparingDouble(SlotContext::drifBonus))
                .toList();

        for (int lowIndex = 0; lowIndex < slots.size() && !control.exhausted(); lowIndex++) {
            SlotContext low = slots.get(lowIndex);
            for (int highIndex = slots.size() - 1;
                 highIndex > lowIndex && !control.exhausted(); highIndex--) {
                SlotContext high = slots.get(highIndex);
                if (high.drifBonus() <= low.drifBonus()) continue;
                addDirectedSwaps(current, low, high, context, control, candidates);
            }
        }

        List<BuildState> finalists = directedFinalists(candidates, context);
        BuildState best = current;
        for (BuildState candidate : finalists) {
            control.rememberEvaluated(candidate);
            if (!candidate.signature().equals(best.signature())
                    && isBetterActualState(candidate, best, context)) {
                best = candidate;
            }
        }
        return best;
    }

    private List<BuildState> directedFinalists(List<BuildState> candidates,
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

    private void addDirectedSwaps(BuildState state, SlotContext low, SlotContext high,
                                  OptimizationContext context, SearchControl control,
                                  List<BuildState> candidates) {
        List<Placement> lowPlacements = state.slots.get(low.key());
        List<Placement> highPlacements = state.slots.get(high.key());
        for (int lowPosition = 0;
             lowPosition < Math.min(low.maxDrifs(), lowPlacements.size()); lowPosition++) {
            Placement promoted = lowPlacements.get(lowPosition);
            if (!isMovableMaximized(promoted, low, lowPosition, context)) continue;

            for (int highPosition = 0;
                 highPosition < Math.min(high.maxDrifs(), highPlacements.size()); highPosition++) {
                if (!control.tryConsume()) return;
                Placement displaced = highPlacements.get(highPosition);
                if (!isMovable(displaced, high, highPosition)
                        || !accepts(high, promoted)
                        || (displaced != null && !accepts(low, displaced))) continue;

                BuildState trial = state.copy();
                trial.setPlacement(low.key(), lowPosition, displaced);
                trial.setPlacement(high.key(), highPosition, promoted);
                if (hasDuplicateBonuses(trial.slots.get(low.key()))
                        || hasDuplicateBonuses(trial.slots.get(high.key()))
                        || !fitsCapacity(trial.slots.get(low.key()), low)
                        || !fitsCapacity(trial.slots.get(high.key()), high)
                        || !stateEvaluator.minimumsSatisfied(trial, context)) continue;
                candidates.add(trial);
                if (displaced != null
                        && isForcedCap(displaced.drif().getBonusType(), context.request())) {
                    addForcedCapRepairs(trial, displaced.drif().getBonusType(),
                            context, control, candidates);
                }
            }
        }
    }

    private void addForcedCapRepairs(BuildState state, DRIF_BONUS_TYPE capType,
                                     OptimizationContext context, SearchControl control,
                                     List<BuildState> candidates) {
        if (stateEvaluator.globalCount(state, capType, context)
                >= maxQuantity(capType, context.request())) return;
        int repairs = 0;
        for (SlotContext slot : context.slots()) {
            if (repairs >= MAX_CAP_REPAIRS_PER_SWAP || control.exhausted()) return;
            if (!slot.optimizable() || isSlotLocked(slot, context)) continue;
            DrifTemplate capDrif = slot.candidates().stream()
                    .filter(candidate -> candidate.getBonusType() == capType)
                    .findFirst().orElse(null);
            if (capDrif == null) continue;
            List<Placement> placements = state.slots.get(slot.key());
            if (containsBonusExcept(placements, capType, -1)) continue;

            for (int position = 0;
                 position < Math.min(slot.maxDrifs(), placements.size()); position++) {
                Placement removed = placements.get(position);
                if (!isMovable(removed, slot, position)
                        || (removed != null && (isForcedCap(
                        removed.drif().getBonusType(), context.request())
                        || isMaximized(removed.drif().getBonusType(), context.request())))) continue;

                for (Integer level : fittingLevels(placements, slot, capDrif, position)) {
                    if (!control.tryConsume()) return;
                    BuildState repaired = state.copy();
                    repaired.setPlacement(slot.key(), position,
                            new Placement(capDrif, level, false));
                    if (!fitsCapacity(repaired.slots.get(slot.key()), slot)) continue;
                    repairs++;
                    if (stateEvaluator.minimumsSatisfied(repaired, context)) {
                        candidates.add(repaired);
                    } else if (removed != null) {
                        addMinimumRepairs(repaired, removed, slot.key(), context,
                                control, candidates);
                    }
                    if (repairs >= MAX_CAP_REPAIRS_PER_SWAP) return;
                }
            }
        }
    }

    private void addMinimumRepairs(BuildState state, Placement missing,
                                   String excludedSlotKey, OptimizationContext context,
                                   SearchControl control, List<BuildState> candidates) {
        int repairs = 0;
        for (SlotContext slot : context.slots()) {
            if (repairs >= MAX_MINIMUM_REPAIRS_PER_CAP || control.exhausted()) return;
            if (slot.key().equals(excludedSlotKey) || !slot.optimizable()
                    || isSlotLocked(slot, context) || !accepts(slot, missing)) continue;
            List<Placement> placements = state.slots.get(slot.key());
            if (containsBonusExcept(placements, missing.drif().getBonusType(), -1)) continue;

            for (int position = 0;
                 position < Math.min(slot.maxDrifs(), placements.size()); position++) {
                Placement victim = placements.get(position);
                if (!isMovable(victim, slot, position)
                        || (victim != null && (isForcedCap(
                        victim.drif().getBonusType(), context.request())
                        || isMaximized(victim.drif().getBonusType(), context.request())))) continue;
                for (Integer level : fittingLevels(
                        placements, slot, missing.drif(), position)) {
                    if (!control.tryConsume()) return;
                    BuildState repaired = state.copy();
                    repaired.setPlacement(slot.key(), position,
                            new Placement(missing.drif(), level, false));
                    if (!fitsCapacity(repaired.slots.get(slot.key()), slot)
                            || !stateEvaluator.minimumsSatisfied(repaired, context)) continue;
                    candidates.add(repaired);
                    repairs++;
                    if (repairs >= MAX_MINIMUM_REPAIRS_PER_CAP) return;
                }
            }
        }
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

    private boolean hasDuplicateBonuses(List<Placement> placements) {
        Set<DRIF_BONUS_TYPE> types = new java.util.HashSet<>();
        for (Placement placement : placements) {
            if (placement != null && !types.add(placement.drif().getBonusType())) return true;
        }
        return false;
    }

    private BuildState improveGroup(BuildState current, List<SlotContext> group,
                                    OptimizationContext context, SearchControl control) {
        List<BuildState> beam = List.of(current);
        for (SlotContext slot : group) {
            List<BuildState> expanded = new ArrayList<>();
            for (BuildState state : beam) {
                if (control.exhausted()) break;
                expanded.addAll(slotNeighbors(state, slot, context, control));
            }
            beam = retainApproximateBeam(expanded, context);
            if (beam.isEmpty() || control.exhausted()) break;
        }

        BuildState best = current;
        for (BuildState candidate : beam.stream()
                .limit(ACTUAL_FINALISTS_PER_GROUP)
                .toList()) {
            control.rememberEvaluated(candidate);
            if (candidate.signature().equals(best.signature())) continue;
            if (isBetterActualState(candidate, best, context)) best = candidate;
        }
        return best;
    }

    private List<BuildState> slotNeighbors(BuildState state, SlotContext slot,
                                           OptimizationContext context, SearchControl control) {
        List<BuildState> neighbors = new ArrayList<>();
        neighbors.add(state);
        if (!slot.optimizable() || isSlotLocked(slot, context)) return neighbors;

        List<Placement> placements = state.slots.get(slot.key());
        for (int index = 0; index < Math.min(placements.size(), slot.maxDrifs()); index++) {
            if (control.exhausted()) break;
            Placement current = placements.get(index);
            if (slot.lockedIndices().contains(index)
                    || (current != null && current.locked())) continue;

            if (current != null && control.tryConsume()) {
                BuildState removed = state.copy();
                removed.setPlacement(slot.key(), index, null);
                if (stateEvaluator.minimumsSatisfied(removed, context)) neighbors.add(removed);
            }

            for (DrifTemplate candidate : slot.candidates()) {
                if (control.exhausted()) break;
                DRIF_BONUS_TYPE candidateType = candidate.getBonusType();
                DRIF_BONUS_TYPE replacedType = current != null
                        ? current.drif().getBonusType()
                        : null;
                if (containsBonusExcept(placements, candidateType, index)
                        || stateEvaluator.globalCountExcept(
                        state, candidateType, replacedType, context)
                        >= maxQuantity(candidateType, context.request())
                        || containsAnotherElemental(state, candidate, current)) continue;

                for (Integer level : fittingLevels(placements, slot, candidate, index)) {
                    if (!control.tryConsume()) break;
                    if (current != null && current.drif().getId().equals(candidate.getId())
                            && current.level() == level) continue;
                    BuildState trial = state.copy();
                    trial.setPlacement(slot.key(), index,
                            new Placement(candidate, level, false));
                    if (fitsCapacity(trial.slots.get(slot.key()), slot)
                            && stateEvaluator.minimumsSatisfied(trial, context)) {
                        neighbors.add(trial);
                    }
                }
            }
        }
        return neighbors;
    }

    private List<BuildState> retainApproximateBeam(List<BuildState> states,
                                                    OptimizationContext context) {
        Map<String, BuildState> unique = new LinkedHashMap<>();
        states.forEach(state -> unique.putIfAbsent(state.signature(), state));
        List<BuildState> retained = new ArrayList<>(unique.values());
        retained.sort((left, right) -> compareApproximate(left, right, context));
        return retained.stream().limit(GROUP_BEAM_WIDTH).toList();
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

    private boolean isBetterActualState(BuildState candidate, BuildState current,
                                        OptimizationContext context) {
        // Both states have been calculator-verified and can later become UI alternatives.
        ActualQuality candidateQuality = actualQuality(candidate, context);
        ActualQuality currentQuality = actualQuality(current, context);
        int comparison = compareLowerIsBetter(candidateQuality.forcedCapDeficit(),
                currentQuality.forcedCapDeficit());
        if (comparison != 0) return comparison > 0;
        comparison = compareHigherIsBetter(candidateQuality.minimumMaximizedProgress(),
                currentQuality.minimumMaximizedProgress());
        if (comparison != 0) return comparison > 0;
        comparison = compareHigherIsBetter(candidateQuality.maximizedProgress(),
                currentQuality.maximizedProgress());
        if (comparison != 0) return comparison > 0;
        return compareHigherIsBetter(candidateQuality.weightedUtility(),
                currentQuality.weightedUtility()) > 0;
    }

    private int compareHigherIsBetter(double candidate, double current) {
        if (candidate > current + MIN_ACTUAL_GAIN) return 1;
        if (candidate < current - MIN_ACTUAL_GAIN) return -1;
        return 0;
    }

    private int compareLowerIsBetter(double candidate, double current) {
        return compareHigherIsBetter(current, candidate);
    }

    private ActualQuality actualQuality(BuildState state, OptimizationContext context) {
        double forcedCapDeficit = 0.0;
        double minimumMaximizedProgress = Double.POSITIVE_INFINITY;
        double maximizedProgress = 0.0;
        double weightedUtility = 0.0;
        boolean hasMaximizedTypes = false;

        for (Map.Entry<DRIF_BONUS_TYPE, Integer> entry
                : context.request().getPriorities().entrySet()) {
            DRIF_BONUS_TYPE type = entry.getKey();
            int priority = Math.max(1, entry.getValue() != null ? entry.getValue() : 1);
            double value = actualUtilityValue(state, type, context);
            Double target = targetFor(type, context.request());
            if (target != null) {
                forcedCapDeficit += Math.max(0.0, target - value) * priority;
            }

            if (isMaximized(type, context.request())) {
                hasMaximizedTypes = true;
                double scale = stateEvaluator.maximizationScale(type, context);
                double progress = scale > 0.0 ? Math.max(0.0, value) / scale : 0.0;
                minimumMaximizedProgress = Math.min(minimumMaximizedProgress, progress);
                maximizedProgress += progress * priority;
            } else if (target != null) {
                weightedUtility += Math.min(value, target) * priority;
            } else {
                weightedUtility += value * priority;
            }
        }

        if (!hasMaximizedTypes) minimumMaximizedProgress = 0.0;
        return new ActualQuality(forcedCapDeficit, minimumMaximizedProgress,
                maximizedProgress, weightedUtility);
    }

    private double actualUtilityValue(BuildState state, DRIF_BONUS_TYPE type,
                                      OptimizationContext context) {
        double value = resultAssembler.actualValue(state, type, context);
        if (!isForcedCap(type, context.request()) && !isMaximized(type, context.request())
                && type.getMaxCap() != null && type.getMaxCap() < 0) {
            return -value;
        }
        return value;
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

    private List<List<SlotContext>> buildGroups(List<SlotContext> slots) {
        List<SlotContext> optimizable = slots.stream()
                .filter(SlotContext::optimizable)
                .sorted(Comparator.comparingDouble(SlotContext::drifBonus).reversed())
                .toList();
        List<List<SlotContext>> groups = new ArrayList<>();
        optimizable.forEach(slot -> groups.add(List.of(slot)));
        for (int first = 0; first < optimizable.size(); first++) {
            for (int second = optimizable.size() - 1; second > first; second--) {
                groups.add(List.of(optimizable.get(first), optimizable.get(second)));
            }
        }
        int edgeCount = Math.min(3, optimizable.size() / 2);
        for (int high = 0; high < edgeCount; high++) {
            for (int low = optimizable.size() - edgeCount; low < optimizable.size(); low++) {
                for (int middle = edgeCount; middle < optimizable.size() - edgeCount; middle++) {
                    groups.add(List.of(optimizable.get(high), optimizable.get(middle),
                            optimizable.get(low)));
                }
            }
        }
        return groups;
    }

    private boolean containsAnotherElemental(BuildState state, DrifTemplate candidate,
                                             Placement replaced) {
        if (!rules.isElementalDamage(candidate.getBonusType())) return false;
        for (List<Placement> placements : state.slots.values()) {
            for (Placement placement : placements) {
                if (placement == null || placement == replaced) continue;
                if (rules.isElementalDamage(placement.drif().getBonusType())) return true;
            }
        }
        return false;
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

    private record ActualQuality(double forcedCapDeficit,
                                 double minimumMaximizedProgress,
                                 double maximizedProgress,
                                 double weightedUtility) { }

    record SearchResult(BuildState best, List<BuildState> evaluatedStates) { }

    private static final class SearchControl {
        private int remainingStates;
        private final Map<String, BuildState> evaluatedStates = new LinkedHashMap<>();

        private SearchControl(int remainingStates) {
            this.remainingStates = remainingStates;
        }

        private boolean tryConsume() {
            if (exhausted()) return false;
            remainingStates--;
            return true;
        }

        private boolean exhausted() {
            return remainingStates <= 0;
        }

        private List<BuildState> evaluatedStates() {
            return new ArrayList<>(evaluatedStates.values());
        }

        private void rememberEvaluated(BuildState state) {
            evaluatedStates.putIfAbsent(state.signature(), state);
        }
    }
}
