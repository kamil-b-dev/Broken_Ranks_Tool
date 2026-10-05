package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.validation;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.experimental.UtilityClass;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.SlotContext;

/** Shared interpretation of slots and drifs preserved by optimizer locks. */
@UtilityClass
class OptimizationPreservedDrifs {
    static Set<Integer> preservedIndexes(
            String key,
            EquipmentRequest.SlotData data,
            SlotContext slot,
            OptimizationRequest request) {
        List<Long> ids = data.getDrifIds() != null ? data.getDrifIds() : List.of();
        if (slot.special()
                || request.getLockedSlots() != null && request.getLockedSlots().contains(key)) {
            Set<Integer> all = new HashSet<>();
            for (int index = 0; index < ids.size(); index++) all.add(index);
            return all;
        }
        return request.getLockedDrifs() != null
                ? request.getLockedDrifs().getOrDefault(key, Set.of())
                : Set.of();
    }

    static Integer requestedLevel(EquipmentRequest.SlotData data, int index) {
        return data.getDrifLevels() == null
                ? 1
                : data.getDrifLevels().getOrDefault(String.valueOf(index), 1);
    }
}
