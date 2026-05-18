package pl.brokenranks.tool.broken_ranks_tool.entity.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum RARITY {
    RARE("Rar"),
    EPIC("Epik"),
    LEGENDARY("Legenda"),
    SET("Set");

    private final String displayName;
}