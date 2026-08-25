package pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl;

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
import static pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl.OptimizationRequestConstraints.maxQuantity;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl.OptimizationSearchModel.*;

/** Rebuilds bounded slot groups after directed promotion moves have been evaluated. */
final class OptimizationLargeNeighborhoodSearch {

    private static final int MAX_GENERATED_STATES = 40_000;
    private static final int GROUP_BEAM_WIDTH = 24;
    private static final int ACTUAL_FINALISTS_PER_GROUP = 4;
    private static final int MAX_ROUNDS = 2;

    private final EquipmentRulesRegistry rules;
    private final OptimizationStateEvaluator stateEvaluator;
    private final OptimizationActualStateComparator actualStateComparator;
    private final OptimizationDirectedMoveSearch directedMoveSearch;

    OptimizationLargeNeighborhoodSearch(
            EquipmentRulesRegistry rules, OptimizationStateEvaluator stateEvaluator,
            OptimizationResultAssembler resultAssembler) {
        this.rules = rules;
        this.stateEvaluator = stateEvaluator;
        this.actualStateComparator = new OptimizationActualStateComparator(
                stateEvaluator, resultAssembler);
        this.directedMoveSearch = new OptimizationDirectedMoveSearch(
                stateEvaluator, actualStateComparator);
    }

    SearchResult improve(BuildState initial, OptimizationContext context) {
        return improve(initial, context, MAX_GENERATED_STATES);
    }

    SearchResult improve(BuildState initial, OptimizationContext context,
                         int maxGeneratedStates) {
        OptimizationNeighborhoodSearchControl control =
                new OptimizationNeighborhoodSearchControl(maxGeneratedStates);
        control.rememberEvaluated(initial);
        BuildState best = directedMoveSearch.improve(initial, context, control);
        List<List<SlotContext>> groups = buildGroups(context.slots());
        for (int round = 0; round < MAX_ROUNDS && !control.exhausted(); round++) {
            String before = best.signature();
            best = improveGroups(best, groups, context, control);
            if (before.equals(best.signature())) break;
        }
        return new SearchResult(best, control.evaluatedStates());
    }

    private BuildState improveGroups(
            BuildState state, List<List<SlotContext>> groups,
            OptimizationContext context, OptimizationNeighborhoodSearchControl control) {
        for (List<SlotContext> group : groups) {
            if (control.exhausted()) break;
            state = improveGroup(state, group, context, control);
        }
        return state;
    }

    private BuildState improveGroup(
            BuildState current, List<SlotContext> group,
            OptimizationContext context, OptimizationNeighborhoodSearchControl control) {
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
        return bestActualFinalist(current, beam, context, control);
    }

    private BuildState bestActualFinalist(
            BuildState current, List<BuildState> beam, OptimizationContext context,
            OptimizationNeighborhoodSearchControl control) {
        BuildState best = current;
        for (BuildState candidate : beam.stream().limit(ACTUAL_FINALISTS_PER_GROUP).toList()) {
            control.rememberEvaluated(candidate);
            if (!candidate.signature().equals(best.signature())
                    && actualStateComparator.isBetter(candidate, best, context)) {
                best = candidate;
            }
        }
        return best;
    }

    private List<BuildState> slotNeighbors(
            BuildState state, SlotContext slot, OptimizationContext context,
            OptimizationNeighborhoodSearchControl control) {
        List<BuildState> neighbors = new ArrayList<>();
        neighbors.add(state);
        if (!slot.optimizable() || isSlotLocked(slot, context)) return neighbors;

        List<Placement> placements = state.slots.get(slot.key());
        int placementLimit = Math.min(placements.size(), slot.maxDrifs());
        for (int index = 0; index < placementLimit && !control.exhausted(); index++) {
            Placement current = placements.get(index);
            if (!isMovable(current, slot, index)) continue;
            addRemovalNeighbor(state, slot, index, current, context, control, neighbors);
            addReplacementNeighbors(state, slot, index, current,
                    placements, context, control, neighbors);
        }
        return neighbors;
    }

    private void addRemovalNeighbor(
            BuildState state, SlotContext slot, int index, Placement current,
            OptimizationContext context, OptimizationNeighborhoodSearchControl control,
            List<BuildState> neighbors) {
        if (current == null || !control.tryConsume()) return;
        BuildState removed = state.copy();
        removed.setPlacement(slot.key(), index, null);
        if (stateEvaluator.minimumsSatisfied(removed, context)) neighbors.add(removed);
    }

    private void addReplacementNeighbors(
            BuildState state, SlotContext slot, int index, Placement current,
            List<Placement> placements, OptimizationContext context,
            OptimizationNeighborhoodSearchControl control, List<BuildState> neighbors) {
        for (DrifTemplate candidate : slot.candidates()) {
            if (control.exhausted()) return;
            if (!isReplacementAllowed(state, placements, index, current, candidate, context)) continue;
            for (Integer level : fittingLevels(placements, slot, candidate, index)) {
                if (!control.tryConsume()) return;
                if (samePlacement(current, candidate, level)) continue;
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

    private boolean isReplacementAllowed(
            BuildState state, List<Placement> placements, int index,
            Placement current, DrifTemplate candidate, OptimizationContext context) {
        DRIF_BONUS_TYPE candidateType = candidate.getBonusType();
        DRIF_BONUS_TYPE replacedType = current != null
                ? current.drif().getBonusType() : null;
        return !containsBonusExcept(placements, candidateType, index)
                && stateEvaluator.globalCountExcept(
                state, candidateType, replacedType, context)
                < maxQuantity(candidateType, context.request())
                && !containsAnotherElemental(state, candidate, current);
    }

    private boolean samePlacement(Placement current, DrifTemplate candidate, int level) {
        return current != null && current.drif().getId().equals(candidate.getId())
                && current.level() == level;
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

    private List<Integer> fittingLevels(
            List<Placement> placements, SlotContext slot,
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
        List<List<SlotContext>> groups = singleAndPairGroups(optimizable);
        addEdgeTripleGroups(groups, optimizable);
        return groups;
    }

    private List<List<SlotContext>> singleAndPairGroups(List<SlotContext> slots) {
        List<List<SlotContext>> groups = new ArrayList<>();
        slots.forEach(slot -> groups.add(List.of(slot)));
        for (int first = 0; first < slots.size(); first++) {
            for (int second = slots.size() - 1; second > first; second--) {
                groups.add(List.of(slots.get(first), slots.get(second)));
            }
        }
        return groups;
    }

    private void addEdgeTripleGroups(
            List<List<SlotContext>> groups, List<SlotContext> slots) {
        int edgeCount = Math.min(3, slots.size() / 2);
        for (int high = 0; high < edgeCount; high++) {
            for (int low = slots.size() - edgeCount; low < slots.size(); low++) {
                for (int middle = edgeCount; middle < slots.size() - edgeCount; middle++) {
                    groups.add(List.of(slots.get(high), slots.get(middle), slots.get(low)));
                }
            }
        }
    }

    private boolean containsAnotherElemental(
            BuildState state, DrifTemplate candidate, Placement replaced) {
        if (!rules.isElementalDamage(candidate.getBonusType())) return false;
        for (List<Placement> placements : state.slots.values()) {
            for (Placement placement : placements) {
                if (placement != null && placement != replaced
                        && rules.isElementalDamage(placement.drif().getBonusType())) return true;
            }
        }
        return false;
    }

    private boolean containsBonusExcept(
            List<Placement> placements, DRIF_BONUS_TYPE type, int ignoredIndex) {
        for (int index = 0; index < placements.size(); index++) {
            Placement placement = placements.get(index);
            if (index != ignoredIndex && placement != null
                    && placement.drif().getBonusType() == type) return true;
        }
        return false;
    }

    private boolean isMovable(Placement placement, SlotContext slot, int position) {
        return !slot.lockedIndices().contains(position)
                && (placement == null || !placement.locked());
    }

    private boolean isSlotLocked(SlotContext slot, OptimizationContext context) {
        return context.request().getLockedSlots() != null
                && context.request().getLockedSlots().contains(slot.key());
    }

    private boolean hasMaximizedTypes(OptimizationContext context) {
        return context.request().getMaximizeBonuses() != null
                && !context.request().getMaximizeBonuses().isEmpty();
    }

    record SearchResult(BuildState best, List<BuildState> evaluatedStates) { }
}
