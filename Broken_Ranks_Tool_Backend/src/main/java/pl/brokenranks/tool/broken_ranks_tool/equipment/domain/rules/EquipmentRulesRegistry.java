package pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.Getter;
import org.springframework.stereotype.Component;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.EQUIPMENT_SLOT;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ITEM_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ORB_CATEGORY;

/** Centralizes equipment game rules and shared rule constants. */
@Component
@Getter
public class EquipmentRulesRegistry {

    /** Defines built-in drifs for specific epic items. */
    public static final Map<String, List<String>> EPIC_BUILTIN_DRIFS =
            Map.of(
                    "Allenor",
                            List.of(
                                    DRIF_BONUS_TYPE.DAMAGE_PHYSICAL.name(),
                                    DRIF_BONUS_TYPE.CRITICAL_CHANCE.name()),
                    "Attawa",
                            List.of(
                                    DRIF_BONUS_TYPE.CRITICAL_CHANCE.name(),
                                    DRIF_BONUS_TYPE.HIT_CHANCE_MENTAL.name()),
                    "Gorthdar",
                            List.of(
                                    DRIF_BONUS_TYPE.DAMAGE_FIRE.name(),
                                    DRIF_BONUS_TYPE.CRITICAL_CHANCE.name()),
                    "Imisindo",
                            List.of(
                                    DRIF_BONUS_TYPE.CRITICAL_CHANCE.name(),
                                    DRIF_BONUS_TYPE.HIT_CHANCE_RANGED.name()),
                    "Latarnia Życia",
                            List.of(
                                    DRIF_BONUS_TYPE.MANA_STEAL.name(),
                                    DRIF_BONUS_TYPE.CRITICAL_CHANCE.name()),
                    "Washi",
                            List.of(
                                    DRIF_BONUS_TYPE.CRITICAL_CHANCE.name(),
                                    DRIF_BONUS_TYPE.HIT_CHANCE_MELEE.name()),
                    "Żmij",
                            List.of(
                                    DRIF_BONUS_TYPE.CRITICAL_CHANCE.name(),
                                    DRIF_BONUS_TYPE.DOUBLE_ATTACK_CHANCE.name()));

    private final Map<String, List<ITEM_CATEGORY>> slotItemRules =
            Arrays.stream(EQUIPMENT_SLOT.values())
                    .collect(
                            Collectors.toUnmodifiableMap(
                                    EQUIPMENT_SLOT::key, EQUIPMENT_SLOT::itemCategories));

    private final Map<String, List<ORB_CATEGORY>> slotOrbRules =
            Arrays.stream(EQUIPMENT_SLOT.values())
                    .collect(
                            Collectors.toUnmodifiableMap(
                                    EQUIPMENT_SLOT::key, EQUIPMENT_SLOT::orbCategories));

    private final List<DRIF_BONUS_TYPE> elementalDamageTypes =
            List.of(
                    DRIF_BONUS_TYPE.DAMAGE_ENERGY,
                    DRIF_BONUS_TYPE.DAMAGE_FIRE,
                    DRIF_BONUS_TYPE.DAMAGE_FROST);

    /**
     * Returns whether an item category is allowed in the requested slot.
     * @param category Item category to check.
     * @param slotKey Equipment slot identifier.
     * @return Whether the category is allowed.
     */
    public boolean isItemAllowedInSlot(ITEM_CATEGORY category, String slotKey) {
        if (category == null || slotKey == null) return false;
        return slotItemRules.getOrDefault(slotKey, List.of()).contains(category);
    }

    /**
     * Returns whether an orb category is allowed in the requested slot.
     * @param category Orb category to check.
     * @param slotKey Equipment slot identifier.
     * @return Whether the category is allowed.
     */
    public boolean isOrbAllowedInSlot(ORB_CATEGORY category, String slotKey) {
        if (category == null || slotKey == null) return false;
        return slotOrbRules.getOrDefault(slotKey, List.of()).contains(category);
    }

    /**
     * Returns whether a drif bonus represents elemental damage.
     * @param type Drif bonus type.
     * @return Whether the bonus is elemental damage.
     */
    public boolean isElementalDamage(DRIF_BONUS_TYPE type) {
        if (type == null) return false;
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
            case 4 -> 0.95;
            case 5 -> 0.87;
            case 6 -> 0.80;
            case 7 -> 0.74;
            case 8 -> 0.69;
            case 9 -> 0.64;
            case 10 -> 0.59;
            case 11 -> 0.54;
            default -> 0.50;
        };
    }
}
