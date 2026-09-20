package pl.brokenranks.tool.broken_ranks_tool.optimization.dto;

import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ITEM_PROFILE;

/** Selects the item profile considered by advisor item replacements. */
public enum AdvisorProfession {
    AUTO,
    MAGICAL,
    PHYSICAL,
    UNIVERSAL;

    public boolean accepts(ITEM_PROFILE profile) {
        if (profile == null) return false;
        return profile == ITEM_PROFILE.UNIVERSAL
                || profile == ITEM_PROFILE.UNSPECIFIED
                || name().equals(profile.name());
    }
}
