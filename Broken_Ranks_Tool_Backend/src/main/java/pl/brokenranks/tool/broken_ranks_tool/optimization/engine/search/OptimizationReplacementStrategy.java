package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.DrifOptimizationMath.fitsCapacity;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints.maxQuantity;

import java.util.List;
import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;

/** Improves a state by replacing individual movable drifs. */
@RequiredArgsConstructor
final class OptimizationReplacementStrategy implements DeterministicRefinementStrategy {
    private static final int MAX_ROUNDS = 3;
    private static final int BASE_LEVEL = 6;
    private final OptimizationStateOperations operations;
    private final OptimizationLevelAllocator levelAllocator;

    @Override
    public BuildState refine(BuildState state, OptimizationContext context) {
        for (int round = 0;
                round < MAX_ROUNDS && !operations.refinementBudgetExhausted(context);
                round++) {
            BuildState best = bestReplacement(state, context);
            if (best.signature().equals(state.signature())) break;
            state = best;
        }
        return state;
    }

    private BuildState bestReplacement(BuildState state, OptimizationContext context) {
        BuildState best = state;
        for (SlotContext slot : context.slots()) {
            if (operations.refinementBudgetExhausted(context)) return state;
            if (!slot.optimizable() || operations.isSlotLocked(slot, context)) continue;
            List<Placement> placements = state.slots().get(slot.key());
            for (int index = 0; index < placements.size(); index++) {
                Placement current = placements.get(index);
                if (current == null || current.locked() || slot.lockedIndices().contains(index))
                    continue;
                for (DrifTemplate candidate : slot.candidates()) {
                    if (!canReplace(state, placements, index, current, candidate, context))
                        continue;
                    BuildState trial = state.copy();
                    trial.setPlacement(
                            slot.key(),
                            index,
                            new Placement(
                                    candidate,
                                    Math.min(BASE_LEVEL, candidate.getSize().getMaxLevel()),
                                    false));
                    levelAllocator.normalizeSlot(trial, slot, context);
                    if (fitsCapacity(trial.slots().get(slot.key()), slot)
                            && operations.minimumsSatisfied(trial, context)
                            && operations.trySelectBetter(trial, best, context)) best = trial;
                }
            }
        }
        return best;
    }

    private boolean canReplace(
            BuildState state,
            List<Placement> placements,
            int index,
            Placement current,
            DrifTemplate candidate,
            OptimizationContext context) {
        return candidate.getBonusType() != current.drif().getBonusType()
                && !operations.containsBonusExcept(placements, candidate.getBonusType(), index)
                && operations.globalCountExcept(
                                state,
                                candidate.getBonusType(),
                                current.drif().getBonusType(),
                                context)
                        < maxQuantity(candidate.getBonusType(), context.request())
                && !operations.containsAnotherElemental(state, candidate, current.drif());
    }
}
