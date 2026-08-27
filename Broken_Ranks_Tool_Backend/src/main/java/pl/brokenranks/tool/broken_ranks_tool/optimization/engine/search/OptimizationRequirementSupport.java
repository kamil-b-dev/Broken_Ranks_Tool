package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.*;

import lombok.RequiredArgsConstructor;

/** Shared slot eligibility rules for focused requirement policies. */
@RequiredArgsConstructor
final class OptimizationRequirementSupport {
    private final OptimizationStateOperations operations;

    boolean canAdd(BuildState state, SlotContext slot, OptimizationContext context) {
        return slot.optimizable()
                && !operations.isSlotLocked(slot, context)
                && operations.hasFreeDrifPosition(state.slots().get(slot.key()), slot);
    }

    boolean movable(Placement placement, SlotContext slot, int index) {
        return placement != null && !placement.locked() && !slot.lockedIndices().contains(index);
    }
}
