package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.refinement;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.*;

import java.util.List;
import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.OptimizationLevelAllocator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.OptimizationStateOperations;

/** Removes movable drifs when doing so improves duplicate penalties. */
@RequiredArgsConstructor
final class OptimizationPenaltyReductionStrategy implements DeterministicRefinementStrategy {
    private static final int MAX_REDUCTIONS = 100;
    private final OptimizationStateOperations operations;
    private final OptimizationLevelAllocator levelAllocator;

    @Override
    public BuildState refine(BuildState state, OptimizationContext context) {
        boolean changed = true;
        int guard = 0;
        while (changed && guard++ < MAX_REDUCTIONS) {
            if (operations.refinementBudgetExhausted(context)) return state;
            changed = false;
            for (SlotContext slot : context.slots()) {
                BuildState reduced = removeFirstBeneficial(state, slot, context);
                if (reduced != state) {
                    state = reduced;
                    changed = true;
                    break;
                }
            }
        }
        return state;
    }

    private BuildState removeFirstBeneficial(
            BuildState state, SlotContext slot, OptimizationContext context) {
        if (operations.refinementBudgetExhausted(context)
                || !slot.optimizable()
                || operations.isSlotLocked(slot, context)) return state;
        List<Placement> placements = state.slots().get(slot.key());
        for (int index = 0; index < placements.size(); index++) {
            Placement placement = placements.get(index);
            if (placement == null || placement.locked() || slot.lockedIndices().contains(index))
                continue;
            BuildState trial = state.copy();
            trial.setPlacement(slot.key(), index, null);
            levelAllocator.normalizeSlot(trial, slot, context);
            if (operations.minimumsSatisfied(trial, context)
                    && operations.trySelectBetter(trial, state, context)) return trial;
        }
        return state;
    }
}
