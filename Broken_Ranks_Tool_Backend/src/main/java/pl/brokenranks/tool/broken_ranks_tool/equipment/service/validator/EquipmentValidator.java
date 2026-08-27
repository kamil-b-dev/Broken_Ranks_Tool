package pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator;

import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.OrbTemplate;

/** Compatibility facade for focused equipment validation policies. */
@Service
public class EquipmentValidator {
    private final EquipmentRequestValidator requests;
    private final EquipmentPlacementRules placement;
    private final UpgradeLevelPolicy levels;
    private final ModifierSecurityValidator security;

    @Autowired
    public EquipmentValidator(
            EquipmentRequestValidator requests,
            EquipmentPlacementRules placement,
            UpgradeLevelPolicy levels,
            ModifierSecurityValidator security) {
        this.requests = requests;
        this.placement = placement;
        this.levels = levels;
        this.security = security;
    }

    public EquipmentValidator(EquipmentRulesRegistry rules) {
        this.requests = new EquipmentRequestValidator();
        this.placement = new EquipmentPlacementRules(rules);
        this.levels = new UpgradeLevelPolicy();
        this.security = new ModifierSecurityValidator(placement, levels);
    }

    public void validateRequest(EquipmentRequest value) {
        requests.validateRequest(value);
    }

    public void validateCharacterStats(Map<String, Integer> value) {
        requests.validateCharacterStats(value);
    }

    public void validateOrbsSecurity(ItemTemplate item, List<OrbTemplate> orbs) {
        security.validateOrbs(item, orbs);
    }

    public void validateDrifsSecurity(
            String slot,
            ItemTemplate item,
            int stars,
            List<DrifTemplate> drifs,
            List<Integer> drifLevels) {
        security.validateDrifs(slot, item, stars, drifs, drifLevels);
    }

    public int calculateItemCapacity(ItemTemplate item, int stars) {
        return levels.calculateItemCapacity(item, stars);
    }

    public int sanitizeDrifLevel(int level, DrifTemplate drif) {
        return levels.sanitizeDrifLevel(level, drif);
    }

    public int sanitizeOrbLevel(int level, OrbTemplate orb) {
        return levels.sanitizeOrbLevel(level, orb);
    }

    public int sanitizeItemStars(int stars) {
        return levels.sanitizeItemStars(stars);
    }

    public boolean isValidItem(ItemTemplate item, String slot) {
        return placement.isValidItem(item, slot);
    }

    public boolean isValidDrif(DrifTemplate drif, String slot) {
        return placement.isValidDrif(drif);
    }

    public boolean isValidOrb(OrbTemplate orb, String slot, boolean second) {
        return placement.isValidOrb(orb, slot, second);
    }

    public boolean isElementalDamage(DRIF_BONUS_TYPE type) {
        return placement.isElementalDamage(type);
    }

    public boolean isElementalDrifPositionValid(DrifTemplate drif, String slot) {
        return placement.isElementalDrifPositionValid(drif, slot);
    }

    public boolean isValidDrifSizeForTier(DrifTemplate drif, ItemTemplate item) {
        return placement.isValidDrifSizeForTier(drif, item);
    }
}
