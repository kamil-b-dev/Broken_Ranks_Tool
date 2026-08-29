package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.construction;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.DrifOptimizationMath.highestFittingLevel;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.DrifOptimizationMath.power;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints.*;

import java.util.List;
import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.evaluation.OptimizationStateEvaluation;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.placement.OptimizationPlacementOperations;

/** Fills unused equipment capacity with bounded optional drif placements. */
@RequiredArgsConstructor
public final class OptimizationResidualCapacityFiller {
    private static final double MIN_ACCEPTED_GAIN = 0.0001;
    private static final double MAX_RESIDUAL_FILL_LOSS = 15.0;

    private final OptimizationPlacementOperations placementOperations;
    private final OptimizationStateEvaluation stateEvaluation;

    public BuildState fill(BuildState state, OptimizationContext context) {
        int maxSteps = context.slots().stream().mapToInt(SlotContext::maxDrifs).sum();
        for (int step = 0; step < maxSteps; step++) {
            SlotPlacementChoice best = bestChoice(state, context);
            if (best == null) break;
            placementOperations.putNextFree(
                    state,
                    best.slot(),
                    new Placement(best.choice().drif(), best.choice().level(), false));
        }
        return state;
    }

    private SlotPlacementChoice bestChoice(BuildState state, OptimizationContext context) {
        SlotPlacementChoice best = null;
        for (SlotContext slot : context.slots()) {
            if (!canFill(state, slot, context)) continue;
            for (DrifTemplate candidate : slot.candidates()) {
                PlacementChoice choice = choice(state, slot, candidate, context);
                if (choice != null && isBetter(choice, best)) {
                    best = new SlotPlacementChoice(slot, choice);
                }
            }
        }
        return best;
    }

    private PlacementChoice choice(
            BuildState state,
            SlotContext slot,
            DrifTemplate candidate,
            OptimizationContext context) {
        DRIF_BONUS_TYPE type = candidate.getBonusType();
        List<Placement> placements = state.slots().get(slot.key());
        Double target = targetFor(type, context.request());
        if (target != null
                && stateEvaluation.calculatedValue(state, type, context)
                        >= target - TARGET_TOLERANCE) return null;
        if (placementOperations.containsBonus(placements, type)
                || stateEvaluation.globalCount(state, type, context)
                        >= maxQuantity(type, context.request())
                || placementOperations.containsAnotherElemental(state, candidate, null))
            return null;

        Integer level = highestFittingLevel(state, slot, candidate);
        if (level == null) return null;
        BuildState trial = state.copy();
        placementOperations.putNextFree(trial, slot, new Placement(candidate, level, false));
        if (!stateEvaluation.minimumsSatisfied(trial, context)) return null;

        double gain = stateEvaluation.score(trial, context) - stateEvaluation.score(state, context);
        int candidatePower = power(candidate, level);
        int currentCount = stateEvaluation.globalCount(state, type, context);
        boolean lightOptionalDrif = candidatePower <= 1 && currentCount < 3;
        if (gain < -MAX_RESIDUAL_FILL_LOSS && !lightOptionalDrif) return null;

        double selectionScore = gain - candidatePower * 0.50 - Math.max(0, currentCount - 3) * 15.0;
        return new PlacementChoice(candidate, level, selectionScore);
    }

    private boolean canFill(BuildState state, SlotContext slot, OptimizationContext context) {
        return slot.optimizable()
                && !placementOperations.isSlotLocked(slot, context)
                && placementOperations.hasFreeDrifPosition(state.slots().get(slot.key()), slot);
    }

    private boolean isBetter(PlacementChoice choice, SlotPlacementChoice current) {
        return current == null
                || choice.gain() > current.choice().gain() + MIN_ACCEPTED_GAIN
                || (Math.abs(choice.gain() - current.choice().gain()) <= MIN_ACCEPTED_GAIN
                        && isEarlierPlacement(choice.drif(), choice.level(), current.choice()));
    }

    private boolean isEarlierPlacement(DrifTemplate candidate, int level, PlacementChoice current) {
        int candidateComparison = Long.compare(candidate.getId(), current.drif().getId());
        return candidateComparison != 0 ? candidateComparison < 0 : level < current.level();
    }

    private record SlotPlacementChoice(SlotContext slot, PlacementChoice choice) {}
}
