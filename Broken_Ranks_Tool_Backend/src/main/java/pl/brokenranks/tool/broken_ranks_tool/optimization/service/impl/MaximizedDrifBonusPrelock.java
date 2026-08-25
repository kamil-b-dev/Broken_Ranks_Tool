package pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl;

import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;

import java.util.Comparator;
import java.util.List;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl.DrifOptimizationMath.power;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl.DrifOptimizationMath.usedPower;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl.OptimizationRequestConstraints.maxQuantity;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl.OptimizationRequestConstraints.minQuantity;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl.OptimizationSearchModel.*;

/** Pre-allocates and locks maximized drifs according to item drif bonuses. */
@RequiredArgsConstructor
final class MaximizedDrifBonusPrelock {

    private final EquipmentRulesRegistry rules;

    void apply(BuildState state, OptimizationContext context) {
        List<SlotContext> slots = eligibleSlots(context);
        for (DRIF_BONUS_TYPE type : maximizedTypes(context)) {
            prelockType(state, slots, type, context);
        }
    }

    private List<DRIF_BONUS_TYPE> maximizedTypes(OptimizationContext context) {
        return context.request().getMaximizeBonuses().stream()
                .sorted(Comparator
                        .comparingInt((DRIF_BONUS_TYPE type) ->
                                context.request().getPriorities().getOrDefault(type, 0)).reversed()
                        .thenComparing(Enum::name))
                .toList();
    }

    private List<SlotContext> eligibleSlots(OptimizationContext context) {
        return context.slots().stream()
                .filter(SlotContext::optimizable)
                .filter(slot -> context.request().getLockedSlots() == null
                        || !context.request().getLockedSlots().contains(slot.key()))
                .sorted(Comparator.comparingDouble(SlotContext::drifBonus).reversed()
                        .thenComparing(SlotContext::key))
                .toList();
    }

    private void prelockType(BuildState state, List<SlotContext> slots,
                             DRIF_BONUS_TYPE type, OptimizationContext context) {
        int count = count(state, type);
        int target = Math.min(minQuantity(type, context.request()),
                maxQuantity(type, context.request()));
        for (SlotContext slot : slots) {
            if (count >= target) return;
            if (tryPrelock(state, slot, type)) count++;
        }
    }

    private boolean tryPrelock(BuildState state, SlotContext slot, DRIF_BONUS_TYPE type) {
        List<Placement> placements = state.slots.get(slot.key());
        if (contains(placements, type) || containsOtherElemental(state, type)) return false;
        int position = firstFreePosition(placements, slot);
        if (position < 0) return false;
        DrifTemplate drif = maximumFittingDrif(slot, placements, type);
        if (drif == null) return false;
        state.setPlacement(slot.key(), position,
                new Placement(drif, drif.getSize().getMaxLevel(), true));
        return true;
    }

    private DrifTemplate maximumFittingDrif(SlotContext slot, List<Placement> placements,
                                            DRIF_BONUS_TYPE type) {
        int remainingPower = slot.capacity() - usedPower(placements);
        return slot.candidates().stream()
                .filter(candidate -> candidate.getBonusType() == type)
                .sorted(Comparator.comparingInt(
                        (DrifTemplate candidate) -> candidate.getSize().getMaxLevel())
                        .reversed().thenComparing(DrifTemplate::getId))
                .filter(candidate -> power(candidate, candidate.getSize().getMaxLevel())
                        <= remainingPower)
                .findFirst().orElse(null);
    }

    private int firstFreePosition(List<Placement> placements, SlotContext slot) {
        for (int index = 0; index < Math.min(placements.size(), slot.maxDrifs()); index++) {
            if (!slot.lockedIndices().contains(index) && placements.get(index) == null) return index;
        }
        return -1;
    }

    private int count(BuildState state, DRIF_BONUS_TYPE type) {
        return (int) state.slots.values().stream().flatMap(List::stream)
                .filter(placement -> placement != null
                        && placement.drif().getBonusType() == type)
                .count();
    }

    private boolean contains(List<Placement> placements, DRIF_BONUS_TYPE type) {
        return placements.stream().anyMatch(placement -> placement != null
                && placement.drif().getBonusType() == type);
    }

    private boolean containsOtherElemental(BuildState state, DRIF_BONUS_TYPE type) {
        if (!rules.isElementalDamage(type)) return false;
        return state.slots.values().stream().flatMap(List::stream)
                .anyMatch(placement -> placement != null
                        && rules.isElementalDamage(placement.drif().getBonusType())
                        && placement.drif().getBonusType() != type);
    }
}
