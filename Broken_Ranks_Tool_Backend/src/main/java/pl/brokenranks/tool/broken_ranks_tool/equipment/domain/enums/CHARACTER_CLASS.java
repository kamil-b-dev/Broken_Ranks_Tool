package pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

/** Lists playable character classes that may be allowed to equip an item. */
@Getter
@AllArgsConstructor
public enum CHARACTER_CLASS {
    BARBARIAN("Barbarzyńca"),
    KNIGHT("Rycerz"),
    ARCHER("Łucznik"),
    FIRE_MAGE("Mag Ognia"),
    DRUID("Druid"),
    SHEED("Sheed"),
    VOODOO("Voodoo");

    private final String description;
}
