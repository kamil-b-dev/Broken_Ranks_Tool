package pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.input;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest.SlotData;

/** Removes only trailing empty orb positions without moving a stone or hiding assigned levels. */
public final class OrbSelectionNormalizer {
    private OrbSelectionNormalizer() {}

    public static EquipmentRequest normalize(EquipmentRequest source) {
        if (source == null) return null;
        var normalized = new EquipmentRequest();
        normalized.setCharacterStats(source.getCharacterStats());
        normalized.setSlots(normalizeSlots(source.getSlots()));
        return normalized;
    }

    public static Map<String, SlotData> normalizeSlots(Map<String, SlotData> slots) {
        if (slots == null) return null;
        Map<String, SlotData> normalized = new LinkedHashMap<>();
        slots.forEach((key, slot) -> normalized.put(key, normalizeSlot(slot)));
        return normalized;
    }

    private static SlotData normalizeSlot(SlotData source) {
        if (source == null || source.getOrbIds() == null) return source;
        int originalCount = source.getOrbIds().size();
        int count = originalCount;
        while (count > 0 && source.getOrbIds().get(count - 1) == null) count--;
        if (count == originalCount) return source;
        var normalized = new SlotData();
        normalized.setItemId(source.getItemId());
        normalized.setItemStars(source.getItemStars());
        normalized.setDrifIds(source.getDrifIds());
        normalized.setDrifLevels(source.getDrifLevels());
        normalized.setOrbIds(new ArrayList<>(source.getOrbIds().subList(0, count)));
        if (source.getOrbLevels() != null) {
            var levels = new ArrayList<>(source.getOrbLevels());
            while (levels.size() > count
                    && levels.size() <= originalCount
                    && levels.getLast() == null) levels.removeLast();
            normalized.setOrbLevels(levels);
        }
        return normalized;
    }
}
