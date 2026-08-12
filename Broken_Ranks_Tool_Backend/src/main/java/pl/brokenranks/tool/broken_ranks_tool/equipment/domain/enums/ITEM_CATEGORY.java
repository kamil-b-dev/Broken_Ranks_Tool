package pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Reprezentuje wszystkie możliwe kategorie (typy) przedmiotów w grze,
 * które odpowiadają slotom ekwipunku.
 */
@Getter
@AllArgsConstructor
public enum ITEM_CATEGORY {
    HELMET("Hełm"),
    ARMOR("Zbroja"),
    LEGS("Spodnie"),
    BOOTS("Buty"),
    GLOVES("Rękawice"),
    BELT("Pas"),
    CAPE("Peleryna"),
    NECKLACE("Naszyjnik"),
    RING("Pierścień"),
    WEAPON_1H("Bron jednoręczna"),
    WEAPON_2H("Broń dwuręczna"),
    WEAPON_RANGED("Bron dystansowa"),
    OFF_HAND("Karwasze/Tarcza");

    private final String description;
}
