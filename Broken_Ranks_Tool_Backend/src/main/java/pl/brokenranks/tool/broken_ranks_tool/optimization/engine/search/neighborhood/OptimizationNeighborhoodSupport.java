package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.neighborhood;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.DrifOptimizationMath.highestLevelForPower;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.DrifOptimizationMath.usedPowerExcept;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationStateEvaluator;

/** Shared deterministic operations used by neighborhood search strategies. */
@RequiredArgsConstructor
final class OptimizationNeighborhoodSupport {

    private final OptimizationStateEvaluator stateEvaluator;

    List<Integer> fittingLevels(
            List<Placement> placements,
            SlotContext slot,
            DrifTemplate candidate,
            int replacedIndex) {
        int availablePower = slot.capacity() - usedPowerExcept(placements, replacedIndex);
        if (availablePower < candidate.getBonusType().getBasePower()) return List.of();
        int highest = highestLevelForPower(candidate, availablePower);
        Set<Integer> levels = new TreeSet<>(Comparator.reverseOrder());
        levels.add(highest);
        for (int level : List.of(6, 11, 16, 21)) {
            if (level <= highest && level <= candidate.getSize().getMaxLevel()) levels.add(level);
        }
        return new ArrayList<>(levels);
    }

    List<BuildState> retainApproximateBeam(List<BuildState> states, OptimizationContext context) {
        Map<String, BuildState> unique = new LinkedHashMap<>();
        states.forEach(state -> unique.putIfAbsent(state.signature(), state));
        List<BuildState> retained = new ArrayList<>(unique.values());
        retained.sort((left, right) -> compareApproximate(left, right, context));
        return retained;
    }

    boolean containsBonusExcept(
            List<Placement> placements, DRIF_BONUS_TYPE type, int ignoredIndex) {
        for (int index = 0; index < placements.size(); index++) {
            Placement placement = placements.get(index);
            if (index != ignoredIndex
                    && placement != null
                    && placement.drif().getBonusType() == type) return true;
        }
        return false;
    }

    boolean isMovable(Placement placement, SlotContext slot, int position) {
        return !slot.lockedIndices().contains(position)
                && (placement == null || !placement.locked());
    }

    boolean isSlotLocked(SlotContext slot, OptimizationContext context) {
        return context.request().getLockedSlots() != null
                && context.request().getLockedSlots().contains(slot.key());
    }

    private int compareApproximate(BuildState left, BuildState right, OptimizationContext context) {
        if (hasMaximizedTypes(context)) {
            boolean leftBetter = stateEvaluator.isBetterMaximizationState(left, right, context);
            boolean rightBetter = stateEvaluator.isBetterMaximizationState(right, left, context);
            if (leftBetter != rightBetter) return leftBetter ? -1 : 1;
        }
        return stateEvaluator.stateComparator(context).compare(left, right);
    }

    private boolean hasMaximizedTypes(OptimizationContext context) {
        return context.request().getMaximizeBonuses() != null
                && !context.request().getMaximizeBonuses().isEmpty();
    }
}
