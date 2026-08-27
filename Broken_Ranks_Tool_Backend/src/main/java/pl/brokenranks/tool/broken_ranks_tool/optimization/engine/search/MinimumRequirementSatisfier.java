package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.DrifOptimizationMath.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints.maxQuantity;

import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;

/** Places the most constrained missing drifs until all quantity minimums are satisfied. */
@RequiredArgsConstructor
final class MinimumRequirementSatisfier {
    private static final double MIN_GAIN = 0.0001;
    private final OptimizationStateOperations operations;
    private final OptimizationRequirementSupport support;

    boolean satisfy(BuildState state, OptimizationContext context) {
        while (true) {
            DRIF_BONUS_TYPE type = mostConstrainedMissingType(state, context);
            if (type == null) return operations.minimumsSatisfied(state, context);
            RequiredPlacementChoice best = bestPlacement(state, type, context);
            if (best == null) return false;
            operations.putNextFree(
                    state, best.slot(), new Placement(best.drif(), best.level(), false));
        }
    }

    private DRIF_BONUS_TYPE mostConstrainedMissingType(
            BuildState state, OptimizationContext context) {
        DRIF_BONUS_TYPE required = null;
        int fewestOptions = Integer.MAX_VALUE;
        for (Map.Entry<DRIF_BONUS_TYPE, OptimizationRequest.QuantityRange> entry :
                context.sortedQuantities()) {
            if (entry.getValue().getMin() - operations.globalCount(state, entry.getKey(), context)
                    <= 0) continue;
            int options = feasiblePlacements(state, entry.getKey(), context);
            if (options == 0) return entry.getKey();
            if (options < fewestOptions) {
                fewestOptions = options;
                required = entry.getKey();
            }
        }
        return required;
    }

    private RequiredPlacementChoice bestPlacement(
            BuildState state, DRIF_BONUS_TYPE type, OptimizationContext context) {
        RequiredPlacementChoice best = null;
        for (SlotContext slot : context.slots()) {
            if (!support.canAdd(state, slot, context)) continue;
            List<Placement> placements = state.slots().get(slot.key());
            for (DrifTemplate candidate : slot.candidates()) {
                if (!allowed(state, placements, candidate, type, context)) continue;
                Integer level = lowestTierFittingLevel(state, slot, candidate);
                if (level == null) continue;
                BuildState trial = state.copy();
                operations.putNextFree(trial, slot, new Placement(candidate, level, false));
                double gain = operations.score(trial, context) - operations.score(state, context);
                if (earlierOrBetter(slot, candidate, level, gain, best))
                    best = new RequiredPlacementChoice(slot, candidate, level, gain);
            }
        }
        return best;
    }

    private boolean allowed(
            BuildState state,
            List<Placement> placements,
            DrifTemplate candidate,
            DRIF_BONUS_TYPE type,
            OptimizationContext context) {
        return candidate.getBonusType() == type
                && !operations.containsBonus(placements, type)
                && operations.globalCount(state, type, context)
                        < maxQuantity(type, context.request())
                && !operations.containsAnotherElemental(state, candidate, null);
    }

    private int feasiblePlacements(
            BuildState state, DRIF_BONUS_TYPE type, OptimizationContext context) {
        int count = 0;
        for (SlotContext slot : context.slots()) {
            if (!support.canAdd(state, slot, context)
                    || operations.containsBonus(state.slots().get(slot.key()), type)) continue;
            if (slot.candidates().stream()
                    .anyMatch(
                            candidate ->
                                    candidate.getBonusType() == type
                                            && !operations.containsAnotherElemental(
                                                    state, candidate, null)
                                            && highestFittingLevel(state, slot, candidate) != null))
                count++;
        }
        return count;
    }

    private boolean earlierOrBetter(
            SlotContext slot,
            DrifTemplate drif,
            int level,
            double gain,
            RequiredPlacementChoice current) {
        if (current == null || gain > current.gain() + MIN_GAIN) return true;
        if (Math.abs(gain - current.gain()) > MIN_GAIN) return false;
        int slotOrder = slot.key().compareTo(current.slot().key());
        if (slotOrder != 0) return slotOrder < 0;
        int drifOrder = Long.compare(drif.getId(), current.drif().getId());
        return drifOrder != 0 ? drifOrder < 0 : level < current.level();
    }
}
