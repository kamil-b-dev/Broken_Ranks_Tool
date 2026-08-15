package pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

/** Groups orb types for filtering and slotting rules. */
@AllArgsConstructor
@Getter
public enum ORB_CATEGORY {
    OFENSIVE("Ofensywne"),
    DEFENSIVE("Defensywne"),
    UTILITY("Użytkowe");

    private final String description;
}
