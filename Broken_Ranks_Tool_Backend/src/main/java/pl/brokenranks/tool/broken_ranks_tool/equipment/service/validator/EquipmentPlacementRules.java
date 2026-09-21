package pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.EQUIPMENT_SLOT;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ITEM_TIER;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ORB_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.RARITY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.OrbTemplate;

/** Decides whether equipment and modifiers fit a slot and item tier. */
@Component
@RequiredArgsConstructor
public class EquipmentPlacementRules {
    private final EquipmentRulesRegistry rules;

    public boolean isValidItem(ItemTemplate item, String slot) {
        return item != null && rules.isItemAllowedInSlot(item.getCategory(), slot);
    }

    public boolean isValidDrif(DrifTemplate drif) {
        return drif != null
                && drif.getBonusType() != null
                && drif.getSize() != null
                && isModifierNumber(drif.getBaseValue())
                && isModifierNumber(drif.getIncrement());
    }

    public boolean isValidOrb(OrbTemplate orb, String slot, ItemTemplate item, boolean second) {
        if (orb == null || !isValidItem(item, slot)) return false;
        boolean legendary = item.getRarity() == RARITY.LEGENDARY;
        if (second) return legendary && orb.getCategory() == ORB_CATEGORY.OFFENSIVE;
        return rules.isOrbAllowedInSlot(orb.getCategory(), slot)
                || legendary && orb.getCategory() == ORB_CATEGORY.OFFENSIVE;
    }

    public boolean isElementalDamage(DRIF_BONUS_TYPE type) {
        return rules.isElementalDamage(type);
    }

    public boolean isElementalDrifPositionValid(DrifTemplate drif, String slot) {
        if (drif == null || drif.getBonusType() == null) return false;
        return !rules.isElementalDamage(drif.getBonusType())
                || EQUIPMENT_SLOT.WEAPON.key().equals(slot);
    }

    public boolean isValidDrifSizeForTier(DrifTemplate drif, ItemTemplate item) {
        if (drif == null || drif.getSize() == null || item == null) return false;
        if (item.getRarity() == RARITY.EPIC || item.getRarity() == RARITY.SET) return true;
        return drif.getSize().ordinal() <= allowedStoneSize(item);
    }

    public boolean isValidOrbSizeForTier(OrbTemplate orb, ItemTemplate item) {
        return orb != null
                && orb.getSize() != null
                && item != null
                && orb.getSize().ordinal() <= allowedStoneSize(item);
    }

    public int maxDrifs(ItemTemplate item, int stars) {
        if (item == null || item.getRarity() == RARITY.EPIC || item.getRarity() == RARITY.SET) {
            return 0;
        }
        int tier = tierLevel(item);
        int max = tier >= 10 ? 3 : tier >= 4 ? 2 : tier >= 1 ? 1 : 0;
        return (tier == 2 || tier == 3) && stars >= 7 ? max + 1 : max;
    }

    private int allowedStoneSize(ItemTemplate item) {
        int tier = tierLevel(item);
        return tier >= 10 ? 3 : tier >= 7 ? 2 : tier >= 4 ? 1 : 0;
    }

    private int tierLevel(ItemTemplate item) {
        return item.getTier() == null ? ITEM_TIER.I.getLevel() : ITEM_TIER.levelOf(item.getTier());
    }

    private boolean isModifierNumber(String value) {
        if (value == null || value.isBlank()) return false;
        try {
            Double.parseDouble(value.replace("%", "").replace(",", ".").trim());
            return true;
        } catch (NumberFormatException exception) {
            return false;
        }
    }
}
