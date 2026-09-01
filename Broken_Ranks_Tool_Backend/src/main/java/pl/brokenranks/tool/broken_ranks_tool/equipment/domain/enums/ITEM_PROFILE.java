package pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

/** Describes the primary attribute profile of an item. */
@Getter
@AllArgsConstructor
public enum ITEM_PROFILE {
    PHYSICAL("Fizyczny"),
    MAGICAL("Magiczny"),
    UNIVERSAL("Uniwersalny"),
    UNSPECIFIED("Nieokreślony");

    private final String description;
}
