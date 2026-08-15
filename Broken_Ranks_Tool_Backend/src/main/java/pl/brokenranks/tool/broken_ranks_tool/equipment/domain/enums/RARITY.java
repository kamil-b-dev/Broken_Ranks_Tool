package pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

/** Defines all item rarities used by the game rules. */
@Getter
@AllArgsConstructor
public enum RARITY {
    RARE("Rar"),
    EPIC("Epik"),
    LEGENDARY("Legenda"),
    SET("Set");

    private final String displayName;
}
