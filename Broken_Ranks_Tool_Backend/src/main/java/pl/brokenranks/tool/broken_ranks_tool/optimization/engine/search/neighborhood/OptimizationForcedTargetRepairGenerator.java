package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.neighborhood;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.DrifOptimizationMath.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints.*;

import java.util.List;
import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationStateEvaluator;

/** Generates repairs that restore a displaced forced-target bonus. */
@RequiredArgsConstructor
final class OptimizationForcedTargetRepairGenerator {
    private static final int MAX_REPAIRS_PER_SWAP = 24;
    private final OptimizationStateEvaluator stateEvaluator;
    private final OptimizationNeighborhoodSupport neighborhoodSupport;
    private final OptimizationMinimumRepairGenerator minimumRepairGenerator;

    void addCandidates(
            BuildState state,
            DRIF_BONUS_TYPE targetType,
            OptimizationContext context,
            OptimizationNeighborhoodSearchControl control,
            List<BuildState> candidates) {
        if (stateEvaluator.globalCount(state, targetType, context)
                >= maxQuantity(targetType, context.request())) return;
        int repairs = 0;
        for (SlotContext slot : context.slots()) {
            if (repairs >= MAX_REPAIRS_PER_SWAP || control.exhausted()) return;
            if (!slot.optimizable() || neighborhoodSupport.isSlotLocked(slot, context)) continue;
            DrifTemplate targetDrif = candidateForType(slot, targetType);
            if (targetDrif == null) continue;
            List<Placement> placements = state.slots().get(slot.key());
            if (neighborhoodSupport.containsBonusExcept(placements, targetType, -1)) continue;
            repairs +=
                    addRepairsInSlot(
                            state,
                            slot,
                            targetDrif,
                            placements,
                            context,
                            control,
                            candidates,
                            MAX_REPAIRS_PER_SWAP - repairs);
        }
    }

    private int addRepairsInSlot(
            BuildState state,
            SlotContext slot,
            DrifTemplate targetDrif,
            List<Placement> placements,
            OptimizationContext context,
            OptimizationNeighborhoodSearchControl control,
            List<BuildState> candidates,
            int remainingRepairs) {
        int repairs = 0;
        int limit = Math.min(slot.maxDrifs(), placements.size());
        for (int position = 0; position < limit && repairs < remainingRepairs; position++) {
            Placement removed = placements.get(position);
            if (!isReplaceableOptional(removed, slot, position, context)) continue;
            for (Integer level :
                    neighborhoodSupport.fittingLevels(placements, slot, targetDrif, position)) {
                if (!control.tryConsume()) return repairs;
                BuildState repaired = state.copy();
                repaired.setPlacement(
                        slot.key(), position, new Placement(targetDrif, level, false));
                if (!fitsCapacity(repaired.slots().get(slot.key()), slot)) continue;
                repairs++;
                if (stateEvaluator.minimumsSatisfied(repaired, context)) candidates.add(repaired);
                else if (removed != null)
                    minimumRepairGenerator.addCandidates(
                            repaired, removed, slot.key(), context, control, candidates);
                if (repairs >= remainingRepairs) return repairs;
            }
        }
        return repairs;
    }

    private boolean isReplaceableOptional(
            Placement placement, SlotContext slot, int position, OptimizationContext context) {
        return neighborhoodSupport.isMovable(placement, slot, position)
                && (placement == null
                        || !isForcedTarget(placement.drif().getBonusType(), context.request())
                                && !isMaximized(
                                        placement.drif().getBonusType(), context.request()));
    }

    private DrifTemplate candidateForType(SlotContext slot, DRIF_BONUS_TYPE type) {
        return slot.candidates().stream()
                .filter(candidate -> candidate.getBonusType() == type)
                .findFirst()
                .orElse(null);
    }
}
