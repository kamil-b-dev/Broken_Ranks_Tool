package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;

/**
 * One run's slot inputs with detached, read-only candidate and lock collections.
 * The original DTO and template entities are shared references, not deeply immutable values;
 * callers must keep them unchanged throughout the run.
 */
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

    public SlotContext {
        candidates = Collections.unmodifiableList(new ArrayList<>(candidates));
        // Preserve invalid null input for the existing business validation message.
        if (lockedIndices != null) {
            lockedIndices = Collections.unmodifiableSet(new LinkedHashSet<>(lockedIndices));
        }
    }

    public boolean optimizable() {
        return !special && maxDrifs > 0;
    }
}
