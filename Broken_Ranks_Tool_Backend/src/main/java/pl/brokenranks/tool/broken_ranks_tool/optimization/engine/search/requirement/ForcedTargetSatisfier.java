package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.requirement;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.DrifOptimizationMath.highestFittingLevel;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints.*;

import java.util.Comparator;
import java.util.List;
import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.evaluation.OptimizationStateEvaluation;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.placement.OptimizationPlacementOperations;

/** Adds drifs until every forced business target is reached or no placement remains. */
@RequiredArgsConstructor
final class ForcedTargetSatisfier {
    private static final double MIN_GAIN = 0.0001;
    private final OptimizationPlacementOperations placements;
    private final OptimizationStateEvaluation evaluation;
    private final OptimizationRequirementSupport support;

    void satisfy(BuildState state, OptimizationContext context) {
        for (DRIF_BONUS_TYPE type : forcedTypes(context)) satisfy(state, type, context);
    }

    private void satisfy(BuildState state, DRIF_BONUS_TYPE type, OptimizationContext context) {
        double target = targetFor(type, context.request());
        int guard = 0;
        while (evaluation.calculatedValue(state, type, context) + TARGET_TOLERANCE < target
                && guard++ < MAX_GLOBAL_DRIFS_PER_TYPE) {
            RequiredPlacementChoice best = bestPlacement(state, type, target, context);
            if (best == null) return;
            placements.putNextFree(
                    state, best.slot(), new Placement(best.drif(), best.level(), false));
        }
    }

    private RequiredPlacementChoice bestPlacement(
            BuildState state, DRIF_BONUS_TYPE type, double target, OptimizationContext context) {
        RequiredPlacementChoice best = null;
        double bestDistance = Double.POSITIVE_INFINITY;
        for (SlotContext slot : context.slots()) {
            if (!support.canAdd(state, slot, context)) continue;
            List<Placement> placements = state.slots().get(slot.key());
            for (DrifTemplate candidate : slot.candidates()) {
                if (candidate.getBonusType() != type
                        || this.placements.containsBonus(placements, type)
                        || evaluation.globalCount(state, type, context)
                                >= maxQuantity(type, context.request())
                        || this.placements.containsAnotherElemental(state, candidate, null))
                    continue;
                Integer level = highestFittingLevel(state, slot, candidate);
                if (level == null) continue;
                BuildState trial = state.copy();
                this.placements.putNextFree(trial, slot, new Placement(candidate, level, false));
                double distance = distance(evaluation.currentValue(trial, type, context), target);
                if (best == null
                        || distance < bestDistance - MIN_GAIN
                        || (Math.abs(distance - bestDistance) <= MIN_GAIN
                                && earlier(slot, candidate, level, best))) {
                    bestDistance = distance;
                    best = new RequiredPlacementChoice(slot, candidate, level, -distance);
                }
            }
        }
        return best;
    }

    private List<DRIF_BONUS_TYPE> forcedTypes(OptimizationContext context) {
        return context.request().getPriorities().keySet().stream()
                .filter(
                        type ->
                                isForcedTarget(type, context.request())
                                        && targetFor(type, context.request()) != null)
                .sorted(
                        Comparator.comparing(
                                        (DRIF_BONUS_TYPE type) ->
                                                evaluation.priorityOf(type, context.request()),
                                        Comparator.reverseOrder())
                                .thenComparing(Enum::name))
                .toList();
    }

    private boolean earlier(
            SlotContext slot, DrifTemplate drif, int level, RequiredPlacementChoice current) {
        int slotOrder = slot.key().compareTo(current.slot().key());
        if (slotOrder != 0) return slotOrder < 0;
        int drifOrder = Long.compare(drif.getId(), current.drif().getId());
        return drifOrder != 0 ? drifOrder < 0 : level < current.level();
    }

    private double distance(double value, double target) {
        return value < target ? target - value : (value - target) * 0.05;
    }
}
