package pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums;

import java.util.List;

/** Defines stable equipment slot keys and their game placement rules. */
public enum EQUIPMENT_SLOT {
    HELMET("helmet", "hełm", List.of(ITEM_CATEGORY.HELMET), List.of(ORB_CATEGORY.DEFENSIVE)),
    ARMOR("armor", "zbroja", List.of(ITEM_CATEGORY.ARMOR), List.of(ORB_CATEGORY.DEFENSIVE)),
    CAPE("cape", "peleryna", List.of(ITEM_CATEGORY.CAPE), List.of(ORB_CATEGORY.OFFENSIVE)),
    LEGS("legs", "spodnie", List.of(ITEM_CATEGORY.LEGS), List.of(ORB_CATEGORY.DEFENSIVE)),
    BOOTS("boots", "buty", List.of(ITEM_CATEGORY.BOOTS), List.of(ORB_CATEGORY.DEFENSIVE)),
    GLOVES("gloves", "rękawice", List.of(ITEM_CATEGORY.GLOVES), List.of(ORB_CATEGORY.OFFENSIVE)),
    BELT("belt", "pas", List.of(ITEM_CATEGORY.BELT), List.of(ORB_CATEGORY.OFFENSIVE)),
    NECKLACE(
            "necklace",
            "naszyjnik",
            List.of(ITEM_CATEGORY.NECKLACE),
            List.of(ORB_CATEGORY.UTILITY)),
    RING_1("ring1", "pierścień 1", List.of(ITEM_CATEGORY.RING), List.of(ORB_CATEGORY.UTILITY)),
    RING_2("ring2", "pierścień 2", List.of(ITEM_CATEGORY.RING), List.of(ORB_CATEGORY.UTILITY)),
    WEAPON(
            "weapon",
            "broń",
            List.of(ITEM_CATEGORY.WEAPON_1H, ITEM_CATEGORY.WEAPON_2H, ITEM_CATEGORY.WEAPON_RANGED),
            List.of(ORB_CATEGORY.OFFENSIVE)),
    SHIELD(
            "shield",
            "druga ręka",
            List.of(ITEM_CATEGORY.OFF_HAND),
            List.of(ORB_CATEGORY.OFFENSIVE, ORB_CATEGORY.DEFENSIVE));

    private final String key;
    private final String label;
    private final List<ITEM_CATEGORY> itemCategories;
    private final List<ORB_CATEGORY> orbCategories;

    EQUIPMENT_SLOT(
            String key,
            String label,
            List<ITEM_CATEGORY> itemCategories,
            List<ORB_CATEGORY> orbCategories) {
        this.key = key;
        this.label = label;
        this.itemCategories = itemCategories;
        this.orbCategories = orbCategories;
    }

    public String key() {
        return key;
    }

    public String label() {
        return label;
    }

    public List<ITEM_CATEGORY> itemCategories() {
        return itemCategories;
    }

    public List<ORB_CATEGORY> orbCategories() {
        return orbCategories;
    }

    public static EQUIPMENT_SLOT fromKey(String key) {
        if (key == null) return null;
        for (EQUIPMENT_SLOT slot : values()) {
            if (slot.key.equals(key)) return slot;
        }
        return null;
    }
}
