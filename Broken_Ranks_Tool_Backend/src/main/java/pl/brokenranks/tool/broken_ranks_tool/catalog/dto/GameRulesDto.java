package pl.brokenranks.tool.broken_ranks_tool.catalog.dto;

import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ORB_CATEGORY;

/** Groups the game rules required by frontend equipment logic. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class GameRulesDto {
    /** Built-in drifs for epic and set items, keyed by item name. */
    private Map<String, List<String>> epicBuiltInDrifs;

    /** Orb slotting rules keyed by equipment slot. */
    private Map<String, List<ORB_CATEGORY>> slotOrbRules;

    /** Translations for all drif and orb bonus types, keyed by enum name. */
    private Map<String, String> bonusTranslations;

    /** Base power values for each drif bonus type. */
    private Map<String, Integer> drifBasePowers;

    /** Maximum caps for each drif bonus type, or null when no cap exists. */
    private Map<String, Integer> drifMaxCaps;

    /** Drif bonus categories keyed by bonus enum name. */
    private Map<String, String> drifBonusCategories;

    /** Drif bonus types that may only occur once and only in a weapon. */
    private List<DRIF_BONUS_TYPE> elementalTypes;

    /** Penalty multipliers keyed by the number of drifs with the same modifier. */
    private Map<Integer, Double> drifPenaltyMultipliers;
}
