package pl.brokenranks.tool.broken_ranks_tool.app_data.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ORB_CATEGORY;

import java.util.List;
import java.util.Map;

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

    /** Penalty multipliers keyed by the number of drifs with the same modifier. */
    private Map<Integer, Double> drifPenaltyMultipliers;
}
