package pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ORB_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.RARITY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.util.RomanNumeralParser;
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
        return drif != null && drif.getBonusType() != null;
    }

    public boolean isValidOrb(OrbTemplate orb, String slot, boolean second) {
        if (orb == null) return false;
        return second
                ? orb.getCategory() == ORB_CATEGORY.OFFENSIVE
                : rules.isOrbAllowedInSlot(orb.getCategory(), slot);
    }

    public boolean isElementalDamage(DRIF_BONUS_TYPE type) {
        return rules.isElementalDamage(type);
    }

    public boolean isElementalDrifPositionValid(DrifTemplate drif, String slot) {
        if (drif == null || drif.getBonusType() == null) return false;
        return !rules.isElementalDamage(drif.getBonusType()) || "weapon".equals(slot);
    }

    public boolean isValidDrifSizeForTier(DrifTemplate drif, ItemTemplate item) {
        if (drif == null || drif.getSize() == null || item == null) return false;
        if (item.getRarity() == RARITY.EPIC || item.getRarity() == RARITY.SET) return true;
        int tier =
                item.getTier() == null
                        ? 1
                        : RomanNumeralParser.convertRomanToInteger(item.getTier());
        int allowed = tier >= 10 ? 3 : tier >= 7 ? 2 : tier >= 4 ? 1 : 0;
        return drif.getSize().ordinal() <= allowed;
    }
}
