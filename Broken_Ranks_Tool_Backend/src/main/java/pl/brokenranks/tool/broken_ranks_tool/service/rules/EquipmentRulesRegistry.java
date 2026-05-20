package pl.brokenranks.tool.broken_ranks_tool.service.rules;

import lombok.Getter;
import org.springframework.stereotype.Component;
import pl.brokenranks.tool.broken_ranks_tool.entity.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.entity.enums.ITEM_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.entity.enums.ORB_CATEGORY;

import java.util.List;
import java.util.Map;

@Component
@Getter
public class EquipmentRulesRegistry {

    private final Map<String, List<ITEM_CATEGORY>> slotItemRules = Map.ofEntries(
            Map.entry("helmet", List.of(ITEM_CATEGORY.HELMET)),
            Map.entry("armor", List.of(ITEM_CATEGORY.ARMOR)),
            Map.entry("cape", List.of(ITEM_CATEGORY.CAPE)),
            Map.entry("legs", List.of(ITEM_CATEGORY.LEGS)),
            Map.entry("boots", List.of(ITEM_CATEGORY.BOOTS)),
            Map.entry("gloves", List.of(ITEM_CATEGORY.GLOVES)),
            Map.entry("belt", List.of(ITEM_CATEGORY.BELT)),
            Map.entry("weapon", List.of(ITEM_CATEGORY.WEAPON_1H, ITEM_CATEGORY.WEAPON_2H, ITEM_CATEGORY.WEAPON_RANGED)),
            Map.entry("shield", List.of(ITEM_CATEGORY.OFF_HAND)),
            Map.entry("ring1", List.of(ITEM_CATEGORY.RING)),
            Map.entry("ring2", List.of(ITEM_CATEGORY.RING)),
            Map.entry("necklace", List.of(ITEM_CATEGORY.NECKLACE))
    );

    private final Map<String, List<ORB_CATEGORY>> slotOrbRules = Map.ofEntries(
            Map.entry("weapon", List.of(ORB_CATEGORY.OFENSIVE)),
            Map.entry("shield", List.of(ORB_CATEGORY.OFENSIVE, ORB_CATEGORY.DEFENSIVE)),
            Map.entry("helmet", List.of(ORB_CATEGORY.DEFENSIVE)),
            Map.entry("armor", List.of(ORB_CATEGORY.DEFENSIVE)),
            Map.entry("legs", List.of(ORB_CATEGORY.DEFENSIVE)),
            Map.entry("boots", List.of(ORB_CATEGORY.DEFENSIVE)),
            Map.entry("cape", List.of(ORB_CATEGORY.OFENSIVE)),
            Map.entry("belt", List.of(ORB_CATEGORY.OFENSIVE)),
            Map.entry("gloves", List.of(ORB_CATEGORY.OFENSIVE)),
            Map.entry("ring1", List.of(ORB_CATEGORY.UTILITY)),
            Map.entry("ring2", List.of(ORB_CATEGORY.UTILITY)),
            Map.entry("necklace", List.of(ORB_CATEGORY.UTILITY))
    );

    private final List<DRIF_BONUS_TYPE> elementalDamageTypes = List.of(
            DRIF_BONUS_TYPE.DAMAGE_ENERGY,
            DRIF_BONUS_TYPE.DAMAGE_FIRE,
            DRIF_BONUS_TYPE.DAMAGE_FROST
    );

    public boolean isItemAllowedInSlot(ITEM_CATEGORY category, String slotKey) {
        return slotItemRules.getOrDefault(slotKey, List.of()).contains(category);
    }

    public boolean isOrbAllowedInSlot(ORB_CATEGORY category, String slotKey) {
        return slotOrbRules.getOrDefault(slotKey, List.of()).contains(category);
    }

    public boolean isElementalDamage(DRIF_BONUS_TYPE type) {
        return elementalDamageTypes.contains(type);
    }

    public static double getDrifPenalty(int count) {
        if (count <= 3) return 1.0;
        return switch (count) {
            case 4 -> 0.95; case 5 -> 0.87; case 6 -> 0.80;
            case 7 -> 0.74; case 8 -> 0.69; case 9 -> 0.64;
            case 10 -> 0.59; case 11 -> 0.54; default -> 0.50;
        };
    }
}