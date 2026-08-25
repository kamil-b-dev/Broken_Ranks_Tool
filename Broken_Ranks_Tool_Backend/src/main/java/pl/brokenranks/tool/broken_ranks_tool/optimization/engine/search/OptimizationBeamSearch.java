package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search;

import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.context.OptimizationInitialStateFactory;

import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.DrifOptimizationMath.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints.maxQuantity;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.*;

/** Explores bounded alternative placement profiles with deterministic beam search. */
@RequiredArgsConstructor
final class OptimizationBeamSearch {

    private static final int DEFAULT_BEAM_WIDTH = 12;

    private final OptimizationInitialStateFactory initialStateFactory;
    private final OptimizationRequirementSatisfier requirementSatisfier;
    private final OptimizationLevelAllocator levelAllocator;
    private final OptimizationStateOperations stateOperations;

    BuildState selectBest(BuildState fallback, OptimizationContext context) {
        BuildState best = fallback;
        for (BuildState candidate : buildCandidates(context, DEFAULT_BEAM_WIDTH)) {
            candidate = levelAllocator.maximizeDrifSizes(candidate, context);
            candidate = levelAllocator.allocateByPriority(candidate, context);
            if (stateOperations.trySelectBetter(candidate, best, context)) best = candidate;
        }
        return best;
    }

    private List<BuildState> buildCandidates(OptimizationContext context, int beamWidth) {
        BuildState initial = initialStateFactory.create(context);
        if (!requirementSatisfier.satisfyMinimums(initial, context)) return List.of();

        List<BuildState> beam = List.of(initial);
        for (SlotContext slot : context.slots()) {
            if (context.beamSearchBudget().exhausted()) return beam;
            if (!slot.optimizable() || stateOperations.isSlotLocked(slot, context)) continue;
            beam = expandSlotPositions(beam, slot, beamWidth, context);
            if (beam.isEmpty() || context.beamSearchBudget().exhausted()) return beam;
        }
        return beam.stream()
                .filter(state -> stateOperations.minimumsSatisfied(state, context))
                .sorted(stateOperations.stateComparator(context))
                .toList();
    }

    private List<BuildState> expandSlotPositions(
            List<BuildState> beam, SlotContext slot, int beamWidth,
            OptimizationContext context) {
        for (int index = 0; index < slot.maxDrifs(); index++) {
            if (context.beamSearchBudget().exhausted()) return beam;
            if (slot.lockedIndices().contains(index)) continue;

            List<BuildState> previousBeam = beam;
            List<BuildState> expanded = new ArrayList<>();
            for (BuildState state : beam) {
                if (context.beamSearchBudget().exhausted()) break;
                if (!expandPosition(state, slot, index, expanded, context)) {
                    return previousBeam;
                }
            }
            beam = retainBestProfiles(expanded, beamWidth, context);
            if (beam.isEmpty()) return List.of();
        }
        return beam;
    }

    private boolean expandPosition(BuildState state, SlotContext slot, int index,
                                   List<BuildState> expanded, OptimizationContext context) {
        List<Placement> placements = state.slots().get(slot.key());
        if (index >= placements.size() || placements.get(index) != null) {
            expanded.add(state);
            return true;
        }

        expanded.add(state);
        for (DrifTemplate candidate : slot.candidates()) {
            if (!isCandidateAllowed(state, placements, candidate, context)) continue;
            for (Integer level : candidateLevels(state, slot, candidate)) {
                if (!context.beamSearchBudget().tryConsume()) return false;
                BuildState trial = state.copy();
                trial.setPlacement(slot.key(), index,
                        new Placement(candidate, level, false));
                if (fitsCapacity(trial.slots().get(slot.key()), slot)) expanded.add(trial);
            }
        }
        return true;
    }

    private boolean isCandidateAllowed(BuildState state, List<Placement> placements,
                                       DrifTemplate candidate, OptimizationContext context) {
        return !stateOperations.containsBonus(placements, candidate.getBonusType())
                && stateOperations.globalCount(state, candidate.getBonusType(), context)
                < maxQuantity(candidate.getBonusType(), context.request())
                && !stateOperations.containsAnotherElemental(state, candidate, null);
    }

    private List<Integer> candidateLevels(BuildState state, SlotContext slot,
                                          DrifTemplate candidate) {
        int remaining = slot.capacity() - usedPower(state.slots().get(slot.key()));
        int highest = highestLevelForPower(candidate, remaining);
        if (highest <= 0 || power(candidate, highest) > remaining) return List.of();

        Set<Integer> levels = new TreeSet<>(Comparator.reverseOrder());
        levels.add(highest);
        for (int level : List.of(6, 11, 16, 21)) {
            if (level <= highest && level <= candidate.getSize().getMaxLevel()) levels.add(level);
        }
        return new ArrayList<>(levels);
    }

    private List<BuildState> retainBestProfiles(List<BuildState> states, int beamWidth,
                                                OptimizationContext context) {
        Map<String, BuildState> bestByProfile = new LinkedHashMap<>();
        states.sort(stateOperations.stateComparator(context));
        for (BuildState state : states) {
            if (context.beamSearchBudget().exhausted() && !bestByProfile.isEmpty()) break;
            if (stateOperations.minimumsSatisfied(state, context)) {
                bestByProfile.putIfAbsent(globalCountSignature(state, context), state);
            }
        }
        return bestByProfile.values().stream()
                .sorted(stateOperations.stateComparator(context))
                .limit(beamWidth)
                .toList();
    }

    private String globalCountSignature(BuildState state, OptimizationContext context) {
        return context.request().getPriorities().keySet().stream()
                .sorted(Comparator.comparing(Enum::name))
                .map(type -> type.name() + "="
                        + stateOperations.globalCount(state, type, context))
                .collect(Collectors.joining("|"));
    }
}
