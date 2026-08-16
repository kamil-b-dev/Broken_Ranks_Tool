package pl.brokenranks.tool.broken_ranks_tool.equipment.domain.util;

import lombok.experimental.UtilityClass;

/** Shared power rules for drif levels across calculation and optimization. */
@UtilityClass
public class DrifPowerRules {

    /**
     * Returns the capacity multiplier used by a drif level.
     * @param level Drif level.
     * @return Multiplier from one to four.
     */
    public int effectiveMultiplier(int level) {
        if (level <= 6) return 1;
        if (level <= 11) return 2;
        if (level <= 16) return 3;
        return 4;
    }

    /**
     * Calculates the capacity power of a drif.
     * @param basePower Base power of the drif bonus.
     * @param level Drif level.
     * @return Capacity power used by the drif.
     */
    public int power(int basePower, int level) {
        return basePower * effectiveMultiplier(level);
    }
}
