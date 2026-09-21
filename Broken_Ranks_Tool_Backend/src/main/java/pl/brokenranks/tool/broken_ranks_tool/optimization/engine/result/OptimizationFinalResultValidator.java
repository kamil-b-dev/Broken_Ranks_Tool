package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.DrifOptimizationMath.countPlaced;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.DrifOptimizationMath.usedPower;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentPlacementRules;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationStateEvaluator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationDrifSizeConstraints;

/** Validates hard quantity, slot, capacity, and uniqueness constraints. */
@RequiredArgsConstructor
final class OptimizationFinalResultValidator {

    private final OptimizationStateEvaluator stateEvaluator;
    private final EquipmentPlacementRules placementRules;

    String validate(BuildState state, OptimizationContext context) {
        if (!stateEvaluator.minimumsSatisfied(state, context)) {
            return "Końcowy wynik nie spełnia limitów ilościowych.";
        }
        if (!OptimizationDrifSizeConstraints.satisfied(state, context)) {
            return "Końcowy wynik nie spełnia limitów rozmiarów drifów.";
        }
        for (SlotContext slot : context.slots()) {
            String slotError = validateSlot(state, slot, context);
            if (slotError != null) return slotError;
        }
        return null;
    }

    private String validateSlot(BuildState state, SlotContext slot, OptimizationContext context) {
        List<Placement> placements = state.slots().getOrDefault(slot.key(), List.of());
        if (!preservesRequiredPlacements(placements, slot, context)) {
            return "Końcowy wynik narusza blokadę lub zmienia wbudowany drif w slocie "
                    + slot.key()
                    + ".";
        }
        if (slot.optimizable() && countPlaced(placements) > slot.maxDrifs()) {
            return "Końcowy wynik przekracza limit drifów w slocie " + slot.key() + ".";
        }
        if (slot.optimizable() && usedPower(placements) > slot.capacity()) {
            return "Końcowy wynik przekracza pojemność w slocie " + slot.key() + ".";
        }
        int elemental = 0;
        for (Placement placement : placements) {
            if (placement == null) continue;
            if (!placementRules.isValidDrif(placement.drif())
                    || placement.level() < 1
                    || placement.drif().getSize() != null
                            && placement.level() > placement.drif().getSize().getMaxLevel()) {
                return "Końcowy wynik zawiera nieprawidłowy drif lub poziom w slocie "
                        + slot.key()
                        + ".";
            }
            if (!slot.special()
                    && (!placementRules.isValidDrifSizeForTier(placement.drif(), slot.item())
                            || !placementRules.isElementalDrifPositionValid(
                                    placement.drif(), slot.key()))) {
                return "Końcowy wynik narusza reguły umieszczenia drifa w slocie "
                        + slot.key()
                        + ".";
            }
            if (placementRules.isElementalDamage(placement.drif().getBonusType())
                    && ++elemental > 1) {
                return "Końcowy wynik zawiera więcej niż jeden drif żywiołowy w slocie "
                        + slot.key()
                        + ".";
            }
        }
        return hasDuplicateBonuses(placements)
                ? "Końcowy wynik zawiera zduplikowany mod w slocie " + slot.key() + "."
                : null;
    }

    private boolean preservesRequiredPlacements(
            List<Placement> placements, SlotContext slot, OptimizationContext context) {
        List<Long> originalIds =
                slot.original().getDrifIds() != null ? slot.original().getDrifIds() : List.of();
        Set<Integer> required = new HashSet<>();
        if (slot.special()
                || context.request().getLockedSlots() != null
                        && context.request().getLockedSlots().contains(slot.key())) {
            for (int index = 0; index < originalIds.size(); index++) required.add(index);
        } else if (context.request().getLockedDrifs() != null) {
            required.addAll(context.request().getLockedDrifs().getOrDefault(slot.key(), Set.of()));
        }
        for (Integer index : required) {
            if (index == null || index < 0 || index >= originalIds.size()) return false;
            Long expectedId = originalIds.get(index);
            Placement actual = index < placements.size() ? placements.get(index) : null;
            if (expectedId == null && actual == null) continue;
            if (expectedId == null
                    || actual == null
                    || actual.drif() == null
                    || !expectedId.equals(actual.drif().getId())) {
                return false;
            }
            int expectedLevel =
                    slot.original().getDrifLevels() == null
                            ? 1
                            : slot.original()
                                    .getDrifLevels()
                                    .getOrDefault(String.valueOf(index), 1);
            if (!slot.special() && actual.level() != expectedLevel) return false;
        }
        return !slot.special() || placements.size() == originalIds.size();
    }

    private boolean hasDuplicateBonuses(List<Placement> placements) {
        Set<DRIF_BONUS_TYPE> unique = new HashSet<>();
        for (Placement placement : placements) {
            if (placement != null && !unique.add(placement.drif().getBonusType())) return true;
        }
        return false;
    }
}
