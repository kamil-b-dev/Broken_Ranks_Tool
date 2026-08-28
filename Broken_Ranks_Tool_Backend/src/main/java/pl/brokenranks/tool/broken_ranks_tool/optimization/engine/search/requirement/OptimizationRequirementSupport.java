package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.requirement;

import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.OptimizationPlacementOperations;

/** Shared slot eligibility rules for focused requirement policies. */
@RequiredArgsConstructor
final class OptimizationRequirementSupport {
    private final OptimizationPlacementOperations placements;

    boolean canAdd(BuildState state, SlotContext slot, OptimizationContext context) {
        return slot.optimizable()
                && !placements.isSlotLocked(slot, context)
                && placements.hasFreeDrifPosition(state.slots().get(slot.key()), slot);
    }

    boolean movable(Placement placement, SlotContext slot, int index) {
        return placement != null && !placement.locked() && !slot.lockedIndices().contains(index);
    }
}
