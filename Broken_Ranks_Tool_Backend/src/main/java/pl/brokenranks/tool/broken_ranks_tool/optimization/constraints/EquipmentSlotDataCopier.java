package pl.brokenranks.tool.broken_ranks_tool.optimization.constraints;

import lombok.experimental.UtilityClass;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;

/** Creates independent copies of equipment slot DTOs used by optimizer safeguards. */
@UtilityClass
public class EquipmentSlotDataCopier {

    public static Map<String, EquipmentRequest.SlotData> copySlots(
            Map<String, EquipmentRequest.SlotData> source) {
        Map<String, EquipmentRequest.SlotData> copy = new LinkedHashMap<>();
        if (source == null) return copy;
        source.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .forEach(entry -> copy.put(entry.getKey(), copySlot(entry.getValue())));
        return copy;
    }

    public static EquipmentRequest.SlotData copySlot(EquipmentRequest.SlotData source) {
        if (source == null) return null;
        EquipmentRequest.SlotData copy = new EquipmentRequest.SlotData();
        copy.setItemId(source.getItemId());
        copy.setItemStars(source.getItemStars());
        copy.setOrbIds(source.getOrbIds() != null ? new ArrayList<>(source.getOrbIds()) : null);
        copy.setOrbLevels(source.getOrbLevels() != null
                ? new ArrayList<>(source.getOrbLevels()) : null);
        copy.setDrifIds(source.getDrifIds() != null
                ? new ArrayList<>(source.getDrifIds()) : null);
        copy.setDrifLevels(source.getDrifLevels() != null
                ? new HashMap<>(source.getDrifLevels()) : null);
        return copy;
    }
}
