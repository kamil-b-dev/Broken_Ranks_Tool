package pl.brokenranks.tool.broken_ranks_tool.core.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Reprezentuje ogólną kategorię orba, pozwalając na grupowanie
 * i filtrowanie (np. ofensywne, defensywne).
 */
@AllArgsConstructor
@Getter
public enum ORB_CATEGORY {
    OFENSIVE("Ofensywne"),
    DEFENSIVE("Defensywne"),
    UTILITY("Użytkowe");

    private final String description;
}
