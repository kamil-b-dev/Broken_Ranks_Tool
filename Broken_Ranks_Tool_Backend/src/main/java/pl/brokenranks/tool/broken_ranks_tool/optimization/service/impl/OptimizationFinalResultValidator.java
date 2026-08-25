package pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl;

import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl.DrifOptimizationMath.countPlaced;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl.DrifOptimizationMath.usedPower;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl.OptimizationSearchModel.*;

/** Validates hard quantity, slot, capacity, and uniqueness constraints. */
@RequiredArgsConstructor
final class OptimizationFinalResultValidator {

    private final OptimizationStateEvaluator stateEvaluator;

    String validate(BuildState state, OptimizationContext context) {
        if (!stateEvaluator.minimumsSatisfied(state, context)) {
            return "Końcowy wynik nie spełnia limitów ilościowych.";
        }
        for (SlotContext slot : context.slots()) {
            String slotError = validateSlot(state, slot);
            if (slotError != null) return slotError;
        }
        return null;
    }

    private String validateSlot(BuildState state, SlotContext slot) {
        List<Placement> placements = state.slots.getOrDefault(slot.key(), List.of());
        if (slot.optimizable() && countPlaced(placements) > slot.maxDrifs()) {
            return "Końcowy wynik przekracza limit drifów w slocie " + slot.key() + ".";
        }
        if (slot.optimizable() && usedPower(placements) > slot.capacity()) {
            return "Końcowy wynik przekracza pojemność w slocie " + slot.key() + ".";
        }
        return hasDuplicateBonuses(placements)
                ? "Końcowy wynik zawiera zduplikowany mod w slocie " + slot.key() + "."
                : null;
    }

    private boolean hasDuplicateBonuses(List<Placement> placements) {
        Set<DRIF_BONUS_TYPE> unique = new HashSet<>();
        for (Placement placement : placements) {
            if (placement != null && !unique.add(placement.drif().getBonusType())) return true;
        }
        return false;
    }
}
