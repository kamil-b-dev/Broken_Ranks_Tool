package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.placement;

import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentPlacementRules;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.*;

/** Provides placement validation, lookup, and mutation operations for build states. */
@RequiredArgsConstructor
public final class OptimizationPlacementOperations {
    private final EquipmentPlacementRules placementRules;
    private final EquipmentRulesRegistry rules;

    public boolean isSlotLocked(SlotContext slot, OptimizationContext context) {
        return isSlotLocked(slot, context.request());
    }

    public boolean isSlotLocked(SlotContext slot, OptimizationRequest request) {
        return request.getLockedSlots() != null && request.getLockedSlots().contains(slot.key());
    }

    public boolean isValidForSlot(DrifTemplate drif, SlotContext slot) {
        return placementRules.isValidDrifSizeForTier(drif, slot.item())
                && placementRules.isElementalDrifPositionValid(drif, slot.key());
    }

    public boolean containsAnotherElemental(
            BuildState state, DrifTemplate candidate, DrifTemplate replaced) {
        if (!rules.isElementalDamage(candidate.getBonusType())) return false;
        for (List<Placement> placements : state.slots().values()) {
            for (Placement placement : placements) {
                if (placement != null
                        && rules.isElementalDamage(placement.drif().getBonusType())
                        && (replaced == null
                                || placement.drif().getBonusType() != replaced.getBonusType())) {
                    return true;
                }
            }
        }
        return false;
    }

    public boolean containsBonus(List<Placement> placements, DRIF_BONUS_TYPE type) {
        return placements.stream()
                .filter(Objects::nonNull)
                .anyMatch(placement -> placement.drif().getBonusType() == type);
    }

    public boolean containsBonusExcept(
            List<Placement> placements, DRIF_BONUS_TYPE type, int ignoredIndex) {
        for (int index = 0; index < placements.size(); index++) {
            Placement placement = placements.get(index);
            if (index != ignoredIndex
                    && placement != null
                    && placement.drif().getBonusType() == type) return true;
        }
        return false;
    }

    public boolean hasFreeDrifPosition(List<Placement> placements, SlotContext slot) {
        if (placements.size() < slot.maxDrifs()) return true;
        int limit = Math.min(placements.size(), slot.maxDrifs());
        for (int index = 0; index < limit; index++) {
            if (!slot.lockedIndices().contains(index) && placements.get(index) == null) return true;
        }
        return false;
    }

    public void putNextFree(BuildState state, SlotContext slot, Placement placement) {
        List<Placement> placements = state.slots().get(slot.key());
        int limit = Math.min(placements.size(), Math.max(0, slot.maxDrifs()));
        for (int index = 0; index < limit; index++) {
            if (!slot.lockedIndices().contains(index) && placements.get(index) == null) {
                state.setPlacement(slot.key(), index, placement);
                return;
            }
        }
    }
}
