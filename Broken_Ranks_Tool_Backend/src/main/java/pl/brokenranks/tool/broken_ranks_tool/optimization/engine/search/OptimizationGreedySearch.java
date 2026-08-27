package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.DrifOptimizationMath.highestFittingLevel;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.DrifOptimizationMath.power;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.context.OptimizationInitialStateFactory;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result.OptimizationResultAssembler;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.requirement.OptimizationRequirementSatisfier;

/** Builds the deterministic greedy state and safely fills residual capacity. */
@RequiredArgsConstructor
final class OptimizationGreedySearch {

    private static final double MIN_ACCEPTED_GAIN = 0.0001;
    private static final double MAX_RESIDUAL_FILL_LOSS = 15.0;

    private final OptimizationInitialStateFactory initialStateFactory;
    private final MaximizedDrifBonusPrelock maximizedDrifBonusPrelock;
    private final OptimizationResultAssembler resultAssembler;
    private final OptimizationRequirementSatisfier requirementSatisfier;
    private final OptimizationStateOperations stateOperations;

    BuildState buildInitialCandidate(OptimizationContext context) {
        BuildState state = initialStateFactory.create(context);
        applyOptionalPrelocks(state, context);
        resultAssembler.calibrateCalculatorBaseline(state, context);
        if (!requirementSatisfier.satisfyMinimums(state, context)) return null;
        requirementSatisfier.satisfyForcedTargets(state, context);
        fillByWeightedGain(state, context);
        return state;
    }

    BuildState fillResidualCapacity(BuildState state, OptimizationContext context) {
        int maxSteps = context.slots().stream().mapToInt(SlotContext::maxDrifs).sum();
        for (int step = 0; step < maxSteps; step++) {
            SlotPlacementChoice best = bestResidualChoice(state, context);
            if (best == null) break;
            stateOperations.putNextFree(
                    state,
                    best.slot(),
                    new Placement(best.choice().drif(), best.choice().level(), false));
        }
        return state;
    }

    private void applyOptionalPrelocks(BuildState state, OptimizationContext context) {
        if (context.request().isForceMaximizationByDrifBonus()
                && context.request().getMaximizeBonuses() != null) {
            maximizedDrifBonusPrelock.apply(state, context);
        }
    }

    private void fillByWeightedGain(BuildState state, OptimizationContext context) {
        Map<DRIF_BONUS_TYPE, Integer> globalCounts = countPlacedBonusTypes(state);
        for (SlotContext slot : context.slots()) {
            if (!slot.optimizable() || stateOperations.isSlotLocked(slot, context)) continue;
            for (int index = 0; index < slot.maxDrifs(); index++) {
                if (slot.lockedIndices().contains(index)) continue;
                PlacementChoice best = bestGreedyChoice(state, slot, globalCounts, context);
                if (best == null || best.gain() <= MIN_ACCEPTED_GAIN) break;
                stateOperations.putNextFree(
                        state, slot, new Placement(best.drif(), best.level(), false));
                globalCounts.merge(best.drif().getBonusType(), 1, Integer::sum);
            }
        }
    }

    private PlacementChoice bestGreedyChoice(
            BuildState state,
            SlotContext slot,
            Map<DRIF_BONUS_TYPE, Integer> globalCounts,
            OptimizationContext context) {
        PlacementChoice best = null;
        for (DrifTemplate candidate : slot.candidates()) {
            if (!isGreedyCandidateAllowed(state, slot, candidate, globalCounts, context)) continue;
            Integer level = highestFittingLevel(state, slot, candidate);
            if (level == null) continue;

            BuildState trial = state.copy();
            stateOperations.putNextFree(trial, slot, new Placement(candidate, level, false));
            double gain =
                    stateOperations.score(trial, context) - stateOperations.score(state, context);
            if (isBetterChoice(candidate, level, gain, best)) {
                best = new PlacementChoice(candidate, level, gain);
            }
        }
        return best;
    }

    private boolean isGreedyCandidateAllowed(
            BuildState state,
            SlotContext slot,
            DrifTemplate candidate,
            Map<DRIF_BONUS_TYPE, Integer> globalCounts,
            OptimizationContext context) {
        DRIF_BONUS_TYPE type = candidate.getBonusType();
        Double target = targetFor(type, context.request());
        return (target == null
                        || stateOperations.calculatedValue(state, type, context)
                                < target - TARGET_TOLERANCE)
                && !stateOperations.containsBonus(state.slots().get(slot.key()), type)
                && globalCounts.getOrDefault(type, 0) < maxQuantity(type, context.request())
                && !stateOperations.containsAnotherElemental(state, candidate, null);
    }

    private SlotPlacementChoice bestResidualChoice(BuildState state, OptimizationContext context) {
        SlotPlacementChoice best = null;
        for (SlotContext slot : context.slots()) {
            if (!canFillSlot(state, slot, context)) continue;
            for (DrifTemplate candidate : slot.candidates()) {
                PlacementChoice choice = residualChoice(state, slot, candidate, context);
                if (choice != null && isBetterResidualChoice(slot, choice, best)) {
                    best = new SlotPlacementChoice(slot, choice);
                }
            }
        }
        return best;
    }

    private PlacementChoice residualChoice(
            BuildState state,
            SlotContext slot,
            DrifTemplate candidate,
            OptimizationContext context) {
        DRIF_BONUS_TYPE type = candidate.getBonusType();
        List<Placement> placements = state.slots().get(slot.key());
        Double target = targetFor(type, context.request());
        if (target != null
                && stateOperations.calculatedValue(state, type, context)
                        >= target - TARGET_TOLERANCE) return null;
        if (stateOperations.containsBonus(placements, type)
                || stateOperations.globalCount(state, type, context)
                        >= maxQuantity(type, context.request())
                || stateOperations.containsAnotherElemental(state, candidate, null)) return null;

        Integer level = highestFittingLevel(state, slot, candidate);
        if (level == null) return null;
        BuildState trial = state.copy();
        stateOperations.putNextFree(trial, slot, new Placement(candidate, level, false));
        if (!stateOperations.minimumsSatisfied(trial, context)) return null;

        double gain = stateOperations.score(trial, context) - stateOperations.score(state, context);
        int candidatePower = power(candidate, level);
        int currentCount = stateOperations.globalCount(state, type, context);
        boolean lightOptionalDrif = candidatePower <= 1 && currentCount < 3;
        if (gain < -MAX_RESIDUAL_FILL_LOSS && !lightOptionalDrif) return null;

        double selectionScore = gain - candidatePower * 0.50 - Math.max(0, currentCount - 3) * 15.0;
        return new PlacementChoice(candidate, level, selectionScore);
    }

    private boolean canFillSlot(BuildState state, SlotContext slot, OptimizationContext context) {
        return slot.optimizable()
                && !stateOperations.isSlotLocked(slot, context)
                && stateOperations.hasFreeDrifPosition(state.slots().get(slot.key()), slot);
    }

    private boolean isBetterResidualChoice(
            SlotContext slot, PlacementChoice choice, SlotPlacementChoice current) {
        return current == null
                || choice.gain() > current.choice().gain() + MIN_ACCEPTED_GAIN
                || (Math.abs(choice.gain() - current.choice().gain()) <= MIN_ACCEPTED_GAIN
                        && isEarlierPlacement(choice.drif(), choice.level(), current.choice()));
    }

    private boolean isBetterChoice(
            DrifTemplate candidate, int level, double gain, PlacementChoice current) {
        return current == null
                || gain > current.gain() + MIN_ACCEPTED_GAIN
                || (Math.abs(gain - current.gain()) <= MIN_ACCEPTED_GAIN
                        && isEarlierPlacement(candidate, level, current));
    }

    private boolean isEarlierPlacement(DrifTemplate candidate, int level, PlacementChoice current) {
        int candidateComparison = Long.compare(candidate.getId(), current.drif().getId());
        return candidateComparison != 0 ? candidateComparison < 0 : level < current.level();
    }

    private Map<DRIF_BONUS_TYPE, Integer> countPlacedBonusTypes(BuildState state) {
        Map<DRIF_BONUS_TYPE, Integer> counts = new HashMap<>();
        for (List<Placement> placements : state.slots().values()) {
            for (Placement placement : placements) {
                if (placement != null) {
                    counts.merge(placement.drif().getBonusType(), 1, Integer::sum);
                }
            }
        }
        return counts;
    }

    private record SlotPlacementChoice(SlotContext slot, PlacementChoice choice) {}
}
