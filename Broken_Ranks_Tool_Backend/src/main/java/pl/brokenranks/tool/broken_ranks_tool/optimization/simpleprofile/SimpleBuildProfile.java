package pl.brokenranks.tool.broken_ranks_tool.optimization.simpleprofile;

/** Profession used to select profile-specific drif modifiers in simple mode. */
public enum SimpleBuildProfile {
    BARBARIAN,
    KNIGHT,
    ARCHER,
    FIRE_MAGE,
    DRUID,
    SHEED,
    VOODOO,

    /** Legacy values retained for old requests and imported configurations. */
    MAGICAL,
    MAGICAL_RANGED,
    MAGICAL_MENTAL,
    PHYSICAL_MELEE,
    PHYSICAL_RANGED
}
