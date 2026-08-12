package pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Reprezentuje ogólną kategorię bonusu, pozwalając na grupowanie
 * i filtrowanie statystyk (np. ofensywne, defensywne).
 */
@Getter
@RequiredArgsConstructor
public enum DRIF_CATEGORY {
    OFENSIVE("Ofensywne"),
    DEFENSIVE("Defensywne"),
    UTILITY("Użytkowe");

    private final String description;
}
