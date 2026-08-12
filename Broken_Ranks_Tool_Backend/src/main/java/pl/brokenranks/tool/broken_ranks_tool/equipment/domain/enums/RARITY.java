package pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Reprezentuje wszystkie możliwe poziomy rzadkości przedmiotów w grze.
 */
@Getter
@AllArgsConstructor
public enum RARITY {
    RARE("Rar"),
    EPIC("Epik"),
    LEGENDARY("Legenda"),
    SET("Set");

    private final String displayName;
}
