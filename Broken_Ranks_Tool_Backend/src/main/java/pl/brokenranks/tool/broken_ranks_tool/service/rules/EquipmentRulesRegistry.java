package pl.brokenranks.tool.broken_ranks_tool.service.rules;

import org.springframework.stereotype.Component;
import pl.brokenranks.tool.broken_ranks_tool.entity.enums.ITEM_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.entity.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.entity.enums.ORB_CATEGORY;

import java.util.List;
import java.util.Map;

@Component
public class EquipmentRulesRegistry {

    private static final List<DRIF_BONUS_TYPE> OFFENSIVE_DRIFS = List.of(
            DRIF_BONUS_TYPE.DAMAGE_ENERGY, DRIF_BONUS_TYPE.DAMAGE_FIRE, DRIF_BONUS_TYPE.DAMAGE_FROST,
            DRIF_BONUS_TYPE.DAMAGE_MAGIC, DRIF_BONUS_TYPE.DAMAGE_PHYSICAL, DRIF_BONUS_TYPE.HIT_CHANCE_MELEE,
            DRIF_BONUS_TYPE.HIT_CHANCE_MENTAL, DRIF_BONUS_TYPE.HIT_CHANCE_RANGED, DRIF_BONUS_TYPE.MANA_STEAL
    );

    private static final List<DRIF_BONUS_TYPE> DEFENSIVE_DRIFS = List.of(
            DRIF_BONUS_TYPE.DEFENSE_MELEE, DRIF_BONUS_TYPE.DEFENSE_MENTAL, DRIF_BONUS_TYPE.DEFENSE_RANGE,
            DRIF_BONUS_TYPE.DAMAGE_REDUCTION, DRIF_BONUS_TYPE.DAMAGE_REDUCTION_CHANCE,
            DRIF_BONUS_TYPE.PASIVE_DAMAGE_REDUCTION, DRIF_BONUS_TYPE.PERCENTAGE_DAMAGE_REDUCTION,
            DRIF_BONUS_TYPE.CRITICAL_DAMAGE_REDUCTION, DRIF_BONUS_TYPE.CRITICAL_DAMAGE_CHANCE_REDUCTION,
            DRIF_BONUS_TYPE.CC_PROTECTION, DRIF_BONUS_TYPE.DODGE_CHANCE
    );

    private static final List<DRIF_BONUS_TYPE> UTILITY_DRIFS = List.of(
            DRIF_BONUS_TYPE.CRITICAL_CHANCE, DRIF_BONUS_TYPE.DOUBLE_ATTACK_CHANCE,
            DRIF_BONUS_TYPE.DOUBLE_DEFENSE_ROLL_CHANCE, DRIF_BONUS_TYPE.DOUBLE_HIT_ROLL_CHANCE,
            DRIF_BONUS_TYPE.DISPELL_CHANCE, DRIF_BONUS_TYPE.MANA_REGEN, DRIF_BONUS_TYPE.MANA_USAGE_REDUCTION,
            DRIF_BONUS_TYPE.STAMINA_REGEN, DRIF_BONUS_TYPE.STAMINA_USAGE_REDUCTION,
            DRIF_BONUS_TYPE.MENTAL_DEFENSE_REDUCTION
    );

    private static final Map<String, List<ITEM_CATEGORY>> SLOT_ITEM_RULES = Map.ofEntries(
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

    private static final Map<String, List<DRIF_BONUS_TYPE>> SLOT_DRIF_RULES = Map.ofEntries(
            Map.entry("weapon", OFFENSIVE_DRIFS),
            Map.entry("shield", OFFENSIVE_DRIFS),
            Map.entry("helmet", DEFENSIVE_DRIFS),
            Map.entry("armor", DEFENSIVE_DRIFS),
            Map.entry("cape", DEFENSIVE_DRIFS),
            Map.entry("legs", DEFENSIVE_DRIFS),
            Map.entry("boots", DEFENSIVE_DRIFS),
            Map.entry("gloves", DEFENSIVE_DRIFS),
            Map.entry("belt", DEFENSIVE_DRIFS),
            Map.entry("ring1", UTILITY_DRIFS),
            Map.entry("ring2", UTILITY_DRIFS),
            Map.entry("necklace", UTILITY_DRIFS)
    );

    private static final Map<String, List<ORB_CATEGORY>> SLOT_ORB_RULES = Map.ofEntries(
            Map.entry("weapon", List.of(ORB_CATEGORY.OFENSIVE)),
            Map.entry("shield", List.of(ORB_CATEGORY.OFENSIVE, ORB_CATEGORY.DEFENSIVE)), // Tarcza może czasem znieść obie
            Map.entry("helmet", List.of(ORB_CATEGORY.DEFENSIVE)),
            Map.entry("armor", List.of(ORB_CATEGORY.DEFENSIVE)),
            Map.entry("cape", List.of(ORB_CATEGORY.DEFENSIVE)),
            Map.entry("legs", List.of(ORB_CATEGORY.DEFENSIVE)),
            Map.entry("boots", List.of(ORB_CATEGORY.DEFENSIVE)),
            Map.entry("gloves", List.of(ORB_CATEGORY.DEFENSIVE)),
            Map.entry("belt", List.of(ORB_CATEGORY.DEFENSIVE)),
            Map.entry("ring1", List.of(ORB_CATEGORY.UTILITY)),
            Map.entry("ring2", List.of(ORB_CATEGORY.UTILITY)),
            Map.entry("necklace", List.of(ORB_CATEGORY.UTILITY))
    );

    public boolean isOrbAllowedInSlot(ORB_CATEGORY category, String slotKey) {
        return SLOT_ORB_RULES.getOrDefault(slotKey, List.of()).contains(category);
    }

    public boolean isItemAllowedInSlot(ITEM_CATEGORY category, String slotKey) {
        return SLOT_ITEM_RULES.getOrDefault(slotKey, List.of()).contains(category);
    }

    public boolean isDrifAllowedInSlot(DRIF_BONUS_TYPE type, String slotKey) {
        return SLOT_DRIF_RULES.getOrDefault(slotKey, List.of()).contains(type);
    }
}