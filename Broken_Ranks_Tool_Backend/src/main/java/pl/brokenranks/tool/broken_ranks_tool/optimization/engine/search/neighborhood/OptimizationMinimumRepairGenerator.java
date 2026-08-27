package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.neighborhood;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.DrifOptimizationMath.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints.*;

import java.util.List;
import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationStateEvaluator;

/** Generates compensating moves that restore a minimum requirement after a replacement. */
@RequiredArgsConstructor
final class OptimizationMinimumRepairGenerator {
    private static final int MAX_REPAIRS_PER_TARGET = 12;
    private final OptimizationStateEvaluator stateEvaluator;
    private final OptimizationNeighborhoodSupport neighborhoodSupport;

    void addCandidates(
            BuildState state,
            Placement missing,
            String excludedSlotKey,
            OptimizationContext context,
            OptimizationNeighborhoodSearchControl control,
            List<BuildState> candidates) {
        int repairs = 0;
        for (SlotContext slot : context.slots()) {
            if (repairs >= MAX_REPAIRS_PER_TARGET || control.exhausted()) return;
            if (!acceptsRepair(slot, missing, excludedSlotKey, context)) continue;
            List<Placement> placements = state.slots().get(slot.key());
            if (neighborhoodSupport.containsBonusExcept(
                    placements, missing.drif().getBonusType(), -1)) continue;
            repairs +=
                    addRepairsInSlot(
                            state,
                            slot,
                            missing,
                            placements,
                            context,
                            control,
                            candidates,
                            MAX_REPAIRS_PER_TARGET - repairs);
        }
    }

    private int addRepairsInSlot(
            BuildState state,
            SlotContext slot,
            Placement missing,
            List<Placement> placements,
            OptimizationContext context,
            OptimizationNeighborhoodSearchControl control,
            List<BuildState> candidates,
            int remainingRepairs) {
        int repairs = 0;
        int limit = Math.min(slot.maxDrifs(), placements.size());
        for (int position = 0; position < limit && repairs < remainingRepairs; position++) {
            Placement victim = placements.get(position);
            if (!isReplaceableOptional(victim, slot, position, context)) continue;
            for (Integer level :
                    neighborhoodSupport.fittingLevels(placements, slot, missing.drif(), position)) {
                if (!control.tryConsume()) return repairs;
                BuildState repaired = state.copy();
                repaired.setPlacement(
                        slot.key(), position, new Placement(missing.drif(), level, false));
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

    private boolean acceptsRepair(
            SlotContext slot,
            Placement missing,
            String excludedSlotKey,
            OptimizationContext context) {
        return !slot.key().equals(excludedSlotKey)
                && slot.optimizable()
                && !neighborhoodSupport.isSlotLocked(slot, context)
                && slot.candidates().stream()
                        .anyMatch(candidate -> candidate.getId().equals(missing.drif().getId()));
    }

    private boolean isReplaceableOptional(
            Placement placement, SlotContext slot, int position, OptimizationContext context) {
        return neighborhoodSupport.isMovable(placement, slot, position)
                && (placement == null
                        || !isForcedTarget(placement.drif().getBonusType(), context.request())
                                && !isMaximized(
                                        placement.drif().getBonusType(), context.request()));
    }
}
