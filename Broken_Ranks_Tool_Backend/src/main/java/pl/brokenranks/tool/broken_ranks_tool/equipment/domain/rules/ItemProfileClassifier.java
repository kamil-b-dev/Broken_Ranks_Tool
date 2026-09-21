package pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules;

import java.util.EnumSet;
import java.util.Map;
import java.util.Set;
import lombok.experimental.UtilityClass;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ITEM_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ITEM_PROFILE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.STAT_TYPE;

/** Applies the canonical item-profile rules to item attributes. */
@UtilityClass
public class ItemProfileClassifier {

    private static final Set<ITEM_CATEGORY> WEAPON_CATEGORIES =
            EnumSet.of(
                    ITEM_CATEGORY.WEAPON_1H, ITEM_CATEGORY.WEAPON_2H, ITEM_CATEGORY.WEAPON_RANGED);

    public ITEM_PROFILE classify(ITEM_CATEGORY category, Map<String, Double> stats) {
        if (WEAPON_CATEGORIES.contains(category)) return ITEM_PROFILE.UNSPECIFIED;

        var safeStats = stats == null ? Map.<String, Double>of() : stats;
        boolean physical =
                safeStats.containsKey(STAT_TYPE.STRENGTH.getDescription())
                        || safeStats.containsKey(STAT_TYPE.DEXTERITY.getDescription());
        boolean magical =
                safeStats.containsKey(STAT_TYPE.POWER.getDescription())
                        || safeStats.containsKey(STAT_TYPE.KNOWLEDGE.getDescription());

        if (physical && !magical) return ITEM_PROFILE.PHYSICAL;
        if (magical && !physical) return ITEM_PROFILE.MAGICAL;
        return ITEM_PROFILE.UNIVERSAL;
    }
}
