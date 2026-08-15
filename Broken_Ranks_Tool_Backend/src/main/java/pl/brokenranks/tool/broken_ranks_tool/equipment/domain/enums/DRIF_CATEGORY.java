package pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** Groups drif bonuses for filtering and business rules. */
@Getter
@RequiredArgsConstructor
public enum DRIF_CATEGORY {
    OFENSIVE("Ofensywne"),
    DEFENSIVE("Defensywne"),
    UTILITY("Użytkowe");

    private final String description;
}
