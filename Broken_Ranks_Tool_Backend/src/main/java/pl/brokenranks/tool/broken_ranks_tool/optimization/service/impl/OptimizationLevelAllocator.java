package pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl;

import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl.DrifOptimizationMath.highestLevelForPower;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl.DrifOptimizationMath.usedPowerExcept;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl.OptimizationSearchModel.*;

/** Selects drif sizes and distributes item capacity across unlocked placements. */
@RequiredArgsConstructor
final class OptimizationLevelAllocator {

    private static final int BASE_TIER_MAX_LEVEL = 6;

    private final OptimizationStateOperations stateOperations;

    BuildState maximizeDrifSizes(BuildState state, OptimizationContext context) {
        for (SlotContext slot : context.slots()) {
            if (!slot.optimizable() || stateOperations.isSlotLocked(slot, context)) continue;
            maximizeSlotDrifSizes(state, slot);
        }
        return state;
    }

    BuildState allocateByPriority(BuildState state, OptimizationContext context) {
        for (SlotContext slot : context.slots()) {
            if (!slot.optimizable() || stateOperations.isSlotLocked(slot, context)) continue;
            normalizeSlot(state, slot, context);
        }
        return state;
    }

    void normalizeSlot(BuildState state, SlotContext slot, OptimizationContext context) {
        List<Placement> placements = state.slots.get(slot.key());
        List<Integer> adjustableIndices = resetUnlockedPlacementsToBaseLevel(
                state, slot, placements);
        adjustableIndices.sort(Comparator
                .comparingInt((Integer index) -> stateOperations.priorityOf(
                        placements.get(index).drif().getBonusType(), context.request()))
                .reversed()
                .thenComparing(index -> placements.get(index).drif().getBonusType().name())
                .thenComparingInt(Integer::intValue));

        for (Integer index : adjustableIndices) {
            Placement current = placements.get(index);
            int availablePower = slot.capacity() - usedPowerExcept(placements, index);
            int selectedLevel = highestLevelForPower(current.drif(), availablePower);
            state.setPlacement(slot.key(), index,
                    new Placement(current.drif(), selectedLevel, false));
        }
    }

    private void maximizeSlotDrifSizes(BuildState state, SlotContext slot) {
        List<Placement> placements = state.slots.get(slot.key());
        int placementLimit = Math.min(placements.size(), slot.maxDrifs());
        for (int index = 0; index < placementLimit; index++) {
            Placement current = placements.get(index);
            if (!isAdjustable(current, slot, index)) continue;

            DrifTemplate largest = largestCandidateFor(current, slot);
            int level = Math.min(current.level(), largest.getSize().getMaxLevel());
            state.setPlacement(slot.key(), index, new Placement(largest, level, false));
        }
    }

    private List<Integer> resetUnlockedPlacementsToBaseLevel(
            BuildState state, SlotContext slot, List<Placement> placements) {
        List<Integer> adjustableIndices = new ArrayList<>();
        int placementLimit = Math.min(placements.size(), slot.maxDrifs());
        for (int index = 0; index < placementLimit; index++) {
            Placement placement = placements.get(index);
            if (!isAdjustable(placement, slot, index)) continue;

            int baseLevel = Math.min(BASE_TIER_MAX_LEVEL,
                    placement.drif().getSize().getMaxLevel());
            state.setPlacement(slot.key(), index,
                    new Placement(placement.drif(), baseLevel, false));
            adjustableIndices.add(index);
        }
        return adjustableIndices;
    }

    private boolean isAdjustable(Placement placement, SlotContext slot, int index) {
        return placement != null && !placement.locked()
                && !slot.lockedIndices().contains(index);
    }

    private DrifTemplate largestCandidateFor(Placement current, SlotContext slot) {
        return slot.candidates().stream()
                .filter(candidate -> candidate.getBonusType() == current.drif().getBonusType())
                .max(Comparator
                        .comparingInt((DrifTemplate candidate) -> candidate.getSize().getMaxLevel())
                        .thenComparing(DrifTemplate::getId, Comparator.reverseOrder()))
                .orElse(current.drif());
    }
}
