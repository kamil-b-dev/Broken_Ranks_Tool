package pl.brokenranks.tool.broken_ranks_tool.equipment.domain.parsing;

import lombok.experimental.UtilityClass;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ITEM_TIER;

/** Utility methods for parsing Roman numeral strings. */
@UtilityClass
public class RomanNumeralParser {

    /**
     * Converts a Roman numeral to an integer.
     * @param roman Roman numeral string, such as `I` or `XII`.
     * @return Parsed integer, or zero for invalid input.
     */
    public static int convertRomanToInteger(String roman) {
        return ITEM_TIER.levelOf(roman);
    }
}
