package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result;

import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.constraints.OptimizationLockService;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.constraints.EquipmentSlotDataCopier.copySlot;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.constraints.EquipmentSlotDataCopier.copySlots;

/** Maps internal build states to lock-safe equipment API requests. */
@RequiredArgsConstructor
final class OptimizationSetupMapper {

    private final OptimizationLockService lockService;

    EquipmentRequest toSetup(BuildState state, OptimizationContext context) {
        Map<String, EquipmentRequest.SlotData> slots =
                copySlots(context.request().getOriginalSlots());
        for (SlotContext slot : context.slots()) {
            if (!slot.optimizable()) continue;
            slots.put(slot.key(), optimizedSlot(state, slot));
        }
        slots = lockService.enforce(
                context.request().getOriginalSlots(), slots, context.request());
        enforceDrifLimits(slots, context);

        EquipmentRequest setup = new EquipmentRequest();
        setup.setSlots(slots);
        return setup;
    }

    private EquipmentRequest.SlotData optimizedSlot(BuildState state, SlotContext slot) {
        EquipmentRequest.SlotData output = copySlot(slot.original());
        List<Placement> placements = state.slots().getOrDefault(slot.key(), List.of());
        List<Long> ids = placementIds(placements, slot.maxDrifs());
        output.setDrifIds(ids);
        output.setDrifLevels(placementLevels(placements, slot.maxDrifs()));
        return output;
    }

    private List<Long> placementIds(List<Placement> placements, int maxDrifs) {
        List<Long> ids = new ArrayList<>();
        int outputLimit = Math.min(placements.size(), maxDrifs);
        for (int index = 0; index < outputLimit; index++) {
            Placement placement = placements.get(index);
            ids.add(placement != null ? placement.drif().getId() : null);
        }
        while (!ids.isEmpty() && ids.get(ids.size() - 1) == null) {
            ids.remove(ids.size() - 1);
        }
        return ids;
    }

    private Map<String, Integer> placementLevels(List<Placement> placements, int maxDrifs) {
        Map<String, Integer> levels = new HashMap<>();
        int outputLimit = Math.min(placements.size(), maxDrifs);
        for (int index = 0; index < outputLimit; index++) {
            Placement placement = placements.get(index);
            if (placement != null) levels.put(String.valueOf(index), placement.level());
        }
        return levels;
    }

    private void enforceDrifLimits(Map<String, EquipmentRequest.SlotData> slots,
                                   OptimizationContext context) {
        for (SlotContext slot : context.slots()) {
            if (slot.special()) continue;
            EquipmentRequest.SlotData output = slots.get(slot.key());
            if (!exceedsDrifLimit(output, slot.maxDrifs())) continue;
            output.setDrifIds(new ArrayList<>(
                    output.getDrifIds().subList(0, slot.maxDrifs())));
            output.setDrifLevels(limitedLevels(output.getDrifLevels(), slot.maxDrifs()));
        }
    }

    private boolean exceedsDrifLimit(EquipmentRequest.SlotData output, int limit) {
        return output != null && output.getDrifIds() != null
                && output.getDrifIds().size() > limit;
    }

    private Map<String, Integer> limitedLevels(Map<String, Integer> levels, int limit) {
        Map<String, Integer> limited = new HashMap<>();
        if (levels == null) return limited;
        levels.entrySet().stream()
                .filter(entry -> isIndexWithinLimit(entry.getKey(), limit))
                .forEach(entry -> limited.put(entry.getKey(), entry.getValue()));
        return limited;
    }

    private boolean isIndexWithinLimit(String index, int limit) {
        try {
            return Integer.parseInt(index) < limit;
        } catch (NumberFormatException exception) {
            return false;
        }
    }

}
