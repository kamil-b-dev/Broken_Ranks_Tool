package pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules;

import lombok.Getter;
import org.springframework.stereotype.Component;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ITEM_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ORB_CATEGORY;

import java.util.List;
import java.util.Map;

/** Centralizes equipment game rules and shared rule constants. */
@Component
@Getter
public class EquipmentRulesRegistry {

    /** Defines built-in drifs for specific epic items. */
    public static final Map<String, List<String>> EPIC_BUILTIN_DRIFS = Map.of(
            "Allenor", List.of(DRIF_BONUS_TYPE.DAMAGE_PHYSICAL.name(), DRIF_BONUS_TYPE.CRITICAL_CHANCE.name()),
            "Attawa", List.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE.name(), DRIF_BONUS_TYPE.HIT_CHANCE_MENTAL.name()),
            "Gorthdar", List.of(DRIF_BONUS_TYPE.DAMAGE_FIRE.name(), DRIF_BONUS_TYPE.CRITICAL_CHANCE.name()),
            "Imisindo", List.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE.name(), DRIF_BONUS_TYPE.HIT_CHANCE_RANGED.name()),
            "Latarnia Życia", List.of(DRIF_BONUS_TYPE.MANA_STEAL.name(), DRIF_BONUS_TYPE.CRITICAL_CHANCE.name()),
            "Washi", List.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE.name(), DRIF_BONUS_TYPE.HIT_CHANCE_MELEE.name()),
            "Żmij", List.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE.name(), DRIF_BONUS_TYPE.DOUBLE_ATTACK_CHANCE.name())
    );

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
            Map.entry("weapon", List.of(ORB_CATEGORY.OFFENSIVE)),
            Map.entry("shield", List.of(ORB_CATEGORY.OFFENSIVE, ORB_CATEGORY.DEFENSIVE)),
            Map.entry("helmet", List.of(ORB_CATEGORY.DEFENSIVE)),
            Map.entry("armor", List.of(ORB_CATEGORY.DEFENSIVE)),
            Map.entry("legs", List.of(ORB_CATEGORY.DEFENSIVE)),
            Map.entry("boots", List.of(ORB_CATEGORY.DEFENSIVE)),
            Map.entry("cape", List.of(ORB_CATEGORY.OFFENSIVE)),
            Map.entry("belt", List.of(ORB_CATEGORY.OFFENSIVE)),
            Map.entry("gloves", List.of(ORB_CATEGORY.OFFENSIVE)),
            Map.entry("ring1", List.of(ORB_CATEGORY.UTILITY)),
            Map.entry("ring2", List.of(ORB_CATEGORY.UTILITY)),
            Map.entry("necklace", List.of(ORB_CATEGORY.UTILITY))
    );

    private final List<DRIF_BONUS_TYPE> elementalDamageTypes = List.of(
            DRIF_BONUS_TYPE.DAMAGE_ENERGY,
            DRIF_BONUS_TYPE.DAMAGE_FIRE,
            DRIF_BONUS_TYPE.DAMAGE_FROST
    );

    /**
     * Returns whether an item category is allowed in the requested slot.
     * @param category Item category to check.
     * @param slotKey Equipment slot identifier.
     * @return Whether the category is allowed.
     */
    public boolean isItemAllowedInSlot(ITEM_CATEGORY category, String slotKey) {
        return slotItemRules.getOrDefault(slotKey, List.of()).contains(category);
    }

    /**
     * Returns whether an orb category is allowed in the requested slot.
     * @param category Orb category to check.
     * @param slotKey Equipment slot identifier.
     * @return Whether the category is allowed.
     */
    public boolean isOrbAllowedInSlot(ORB_CATEGORY category, String slotKey) {
        return slotOrbRules.getOrDefault(slotKey, List.of()).contains(category);
    }

    /**
     * Returns whether a drif bonus represents elemental damage.
     * @param type Drif bonus type.
     * @return Whether the bonus is elemental damage.
     */
    public boolean isElementalDamage(DRIF_BONUS_TYPE type) {
        return elementalDamageTypes.contains(type);
    }

    /**
     * Returns the penalty multiplier for more than three drifs of one type.
     * @param count Number of drifs of the same bonus type.
     * @return Penalty multiplier between 0.5 and 1.0.
     */
    public double getDrifPenalty(int count) {
        if (count <= 3) return 1.0;
        return switch (count) {
            case 4 -> 0.95; case 5 -> 0.87; case 6 -> 0.80;
            case 7 -> 0.74; case 8 -> 0.69; case 9 -> 0.64;
            case 10 -> 0.59; case 11 -> 0.54; default -> 0.50;
        };
    }
}
