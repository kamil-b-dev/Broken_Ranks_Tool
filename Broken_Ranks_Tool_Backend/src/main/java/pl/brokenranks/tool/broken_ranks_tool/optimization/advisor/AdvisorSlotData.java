package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.support.EquipmentSlotDataCopier.copySlot;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest.SlotData;

/** Normalizes and identifies mutable slot data used by an advisor search. */
final class AdvisorSlotData {
    private AdvisorSlotData() {}

    static int stars(SlotData slot) {
        return slot.getItemStars() == null || slot.getItemStars() == 0 ? 1 : slot.getItemStars();
    }

    static int size(SlotData slot) {
        return slot.getDrifIds() == null ? 0 : slot.getDrifIds().size();
    }

    static Long id(SlotData slot, int index) {
        return index < size(slot) ? slot.getDrifIds().get(index) : null;
    }

    static int level(SlotData slot, int index) {
        Integer requested =
                slot.getDrifLevels() == null
                        ? 1
                        : slot.getDrifLevels().getOrDefault(Integer.toString(index), 1);
        return requested == null ? 0 : requested;
    }

    static int orbLevel(SlotData slot, int index) {
        return slot.getOrbLevels() == null
                        || index >= slot.getOrbLevels().size()
                        || slot.getOrbLevels().get(index) == null
                ? 1
                : slot.getOrbLevels().get(index);
    }

    static SlotData placed(SlotData source, int index, Long id, int level) {
        SlotData slot = copySlot(source);
        if (slot.getDrifIds() == null) slot.setDrifIds(new ArrayList<>());
        if (slot.getDrifLevels() == null) slot.setDrifLevels(new HashMap<>());
        while (slot.getDrifIds().size() <= index) slot.getDrifIds().add(null);
        slot.getDrifIds().set(index, id);
        if (id == null) slot.getDrifLevels().remove(Integer.toString(index));
        else slot.getDrifLevels().put(Integer.toString(index), level);
        return slot;
    }

    static String signature(Map<String, SlotData> slots) {
        StringBuilder key = new StringBuilder();
        slots.forEach((name, slot) -> key.append(slotSignature(name, slot)).append('|'));
        return key.toString();
    }

    static String slotSignature(String name, SlotData slot) {
        StringBuilder key =
                new StringBuilder(name)
                        .append(':')
                        .append(slot.getItemId())
                        .append(':')
                        .append(stars(slot))
                        .append(':')
                        .append(slot.getOrbIds())
                        .append(':')
                        .append(slot.getOrbLevels());
        int last = size(slot) - 1;
        while (last >= 0 && id(slot, last) == null) last--;
        for (int index = 0; index <= last; index++)
            key.append(':')
                    .append(id(slot, index))
                    .append('@')
                    .append(id(slot, index) == null ? 0 : level(slot, index));
        return key.toString();
    }
}
