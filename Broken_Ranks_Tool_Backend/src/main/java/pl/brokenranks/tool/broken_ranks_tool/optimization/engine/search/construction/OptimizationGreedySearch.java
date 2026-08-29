package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.construction;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.DrifOptimizationMath.highestFittingLevel;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.context.OptimizationInitialStateFactory;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result.OptimizationResultAssembler;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.OptimizationPlacementOperations;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.OptimizationStateEvaluation;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.requirement.OptimizationRequirementSatisfier;

/** Builds the deterministic greedy state and safely fills residual capacity. */
@RequiredArgsConstructor
public final class OptimizationGreedySearch {

    private static final double MIN_ACCEPTED_GAIN = 0.0001;

    private final OptimizationInitialStateFactory initialStateFactory;
    private final MaximizedDrifBonusPrelock maximizedDrifBonusPrelock;
    private final OptimizationResultAssembler resultAssembler;
    private final OptimizationRequirementSatisfier requirementSatisfier;
    private final OptimizationPlacementOperations placementOperations;
    private final OptimizationStateEvaluation stateEvaluation;

    public BuildState buildInitialCandidate(OptimizationContext context) {
        BuildState state = initialStateFactory.create(context);
        applyOptionalPrelocks(state, context);
        resultAssembler.calibrateCalculatorBaseline(state, context);
        if (!requirementSatisfier.satisfyMinimums(state, context)) return null;
        requirementSatisfier.satisfyForcedTargets(state, context);
        fillByWeightedGain(state, context);
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
            if (!slot.optimizable() || placementOperations.isSlotLocked(slot, context)) continue;
            for (int index = 0; index < slot.maxDrifs(); index++) {
                if (slot.lockedIndices().contains(index)) continue;
                PlacementChoice best = bestGreedyChoice(state, slot, globalCounts, context);
                if (best == null || best.gain() <= MIN_ACCEPTED_GAIN) break;
                placementOperations.putNextFree(
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
            placementOperations.putNextFree(trial, slot, new Placement(candidate, level, false));
            double gain =
                    stateEvaluation.score(trial, context) - stateEvaluation.score(state, context);
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
                        || stateEvaluation.calculatedValue(state, type, context)
                                < target - TARGET_TOLERANCE)
                && !placementOperations.containsBonus(state.slots().get(slot.key()), type)
                && globalCounts.getOrDefault(type, 0) < maxQuantity(type, context.request())
                && !placementOperations.containsAnotherElemental(state, candidate, null);
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
}
