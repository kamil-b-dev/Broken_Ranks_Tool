package pl.brokenranks.tool.broken_ranks_tool.equipment.service;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;

/**
 * Provides a high-level equipment API while hiding subsystem complexity.
 * This is the integration point for external modules such as optimization.
 */
public interface EquipmentFacade {

    /**
     * Returns item templates keyed by their identifiers.
     * @param ids Item identifiers to load.
     * @return Templates keyed by item identifier.
     */
    Map<Long, ItemTemplate> getItemTemplates(Collection<Long> ids);

    /** @return All available drif templates. */
    List<DrifTemplate> getAllDrifs();

    /**
     * Calculates the total drif capacity for an item and upgrade level.
     * @param item Item template.
     * @param itemStars Item upgrade level.
     * @return Total available drif capacity.
     */
    int calculateItemCapacity(ItemTemplate item, int itemStars);

    /**
     * Returns whether a drif size is allowed for an item tier.
     * @param drif Drif template to check.
     * @param item Target item template.
     * @return Whether the drif size is allowed.
     */
    boolean isValidDrifSizeForTier(DrifTemplate drif, ItemTemplate item);

    /**
     * Returns whether an elemental drif is placed in a valid slot.
     * @param drif Drif template to check.
     * @param slotKey Equipment slot identifier.
     * @return Whether the elemental drif placement is valid.
     */
    boolean isElementalDrifPositionValid(DrifTemplate drif, String slotKey);
}
