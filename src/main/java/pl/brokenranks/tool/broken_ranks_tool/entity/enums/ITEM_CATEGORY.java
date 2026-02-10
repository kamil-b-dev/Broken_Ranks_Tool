package pl.brokenranks.tool.broken_ranks_tool.entity.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum ITEM_CATEGORY {
    HELMET("Hełm"),
    ARMOR("Zbroja"),
    PANTS("Spodnie"),
    SHOES("Buty"),
    GLOVES("Rękawice"),
    BELT("Pas"),
    CLOAK("Płaszcz"),
    NECKLACE("Naszyjnik"),
    RING("Pierścień"),
    MAIN_HAND("Bron główna"),
    OFF_HAND("Bron pomocnicza"),
    SHIELD("Tarcza");

    private final String description;
}