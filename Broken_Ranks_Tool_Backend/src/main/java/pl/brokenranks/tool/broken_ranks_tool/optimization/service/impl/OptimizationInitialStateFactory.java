package pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl;

import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentValidator;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl.OptimizationSearchModel.*;

/** Reconstructs locked and original placements before the search begins. */
@RequiredArgsConstructor
final class OptimizationInitialStateFactory {

    private final EquipmentValidator validator;

    BuildState create(OptimizationContext context) {
        BuildState state = new BuildState();
        for (SlotContext slot : context.slots()) {
            List<Placement> placements;
            if (!slot.optimizable() || isSlotLocked(slot, context)) {
                placements = readOriginalPlacements(slot, context);
            } else {
                placements = createUnlockedPlacements(slot, context);
            }
            state.slots.put(slot.key(), placements);
        }
        return state;
    }

    private List<Placement> createUnlockedPlacements(SlotContext slot,
                                                       OptimizationContext context) {
        int requiredSize = Math.max(slot.maxDrifs(), maxLockedIndex(slot) + 1);
        List<Placement> placements = new ArrayList<>();
        for (int index = 0; index < requiredSize; index++) placements.add(null);

        for (Integer index : slot.lockedIndices()) {
            if (index == null || index < 0) continue;
            Placement fixed = originalPlacement(slot, index, context);
            if (fixed != null) {
                while (placements.size() <= index) placements.add(null);
                placements.set(index, fixed);
            }
        }
        return placements;
    }

    private List<Placement> readOriginalPlacements(SlotContext slot,
                                                    OptimizationContext context) {
        List<Long> ids = slot.original().getDrifIds() != null
                ? slot.original().getDrifIds()
                : List.of();
        List<Placement> placements = new ArrayList<>();
        for (int index = 0; index < ids.size(); index++) {
            Long id = ids.get(index);
            placements.add(id != null && context.drifs().containsKey(id)
                    ? originalPlacement(slot, index, context)
                    : null);
        }
        return placements;
    }

    private Placement originalPlacement(SlotContext slot, int index,
                                        OptimizationContext context) {
        List<Long> ids = slot.original().getDrifIds();
        if (ids == null || index >= ids.size() || ids.get(index) == null) return null;
        DrifTemplate drif = context.drifs().get(ids.get(index));
        if (drif == null) return null;
        int level = slot.original().getDrifLevels() != null
                ? slot.original().getDrifLevels().getOrDefault(String.valueOf(index), 1)
                : 1;
        return new Placement(drif, validator.sanitizeDrifLevel(level, drif), true);
    }

    private int maxLockedIndex(SlotContext slot) {
        return slot.lockedIndices().stream()
                .filter(Objects::nonNull)
                .mapToInt(Integer::intValue)
                .max()
                .orElse(-1);
    }

    private boolean isSlotLocked(SlotContext slot, OptimizationContext context) {
        return context.request().getLockedSlots() != null
                && context.request().getLockedSlots().contains(slot.key());
    }
}
