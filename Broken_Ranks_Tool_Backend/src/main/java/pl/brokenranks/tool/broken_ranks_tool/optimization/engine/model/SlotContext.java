package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model;

import java.util.List;
import java.util.Set;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;

/** Immutable equipment-slot data used by optimization stages. */
public record SlotContext(
        String key,
        EquipmentRequest.SlotData original,
        ItemTemplate item,
        int capacity,
        int maxDrifs,
        double drifBonus,
        List<DrifTemplate> candidates,
        Set<Integer> lockedIndices,
        boolean special) {

    public boolean optimizable() {
        return !special && maxDrifs > 0;
    }
}
