package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.refinement;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.DrifOptimizationMath.fitsCapacity;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints.maxQuantity;

import java.util.List;
import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.evaluation.OptimizationStateEvaluation;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.level.OptimizationLevelAllocator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.placement.OptimizationPlacementOperations;

/** Improves a state by replacing individual movable drifs. */
@RequiredArgsConstructor
final class OptimizationReplacementStrategy implements DeterministicRefinementStrategy {
    private static final int MAX_ROUNDS = 3;
    private static final int BASE_LEVEL = 6;
    private final OptimizationPlacementOperations placements;
    private final OptimizationStateEvaluation evaluation;
    private final OptimizationLevelAllocator levelAllocator;

    @Override
    public BuildState refine(BuildState state, OptimizationContext context) {
        for (int round = 0;
                round < MAX_ROUNDS && !evaluation.refinementBudgetExhausted(context);
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
            if (evaluation.refinementBudgetExhausted(context)) return state;
            if (!slot.optimizable() || placements.isSlotLocked(slot, context)) continue;
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
                            && evaluation.minimumsSatisfied(trial, context)
                            && evaluation.trySelectBetter(trial, best, context)) best = trial;
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
                && !this.placements.containsBonusExcept(placements, candidate.getBonusType(), index)
                && evaluation.globalCountExcept(
                                state,
                                candidate.getBonusType(),
                                current.drif().getBonusType(),
                                context)
                        < maxQuantity(candidate.getBonusType(), context.request())
                && !this.placements.containsAnotherElemental(state, candidate, current.drif());
    }
}
