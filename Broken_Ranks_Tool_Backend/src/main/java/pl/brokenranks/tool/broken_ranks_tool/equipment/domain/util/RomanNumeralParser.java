package pl.brokenranks.tool.broken_ranks_tool.equipment.domain.util;

import lombok.experimental.UtilityClass;

/** Utility methods for parsing Roman numeral strings. */
@UtilityClass
public class RomanNumeralParser {

    /**
     * Converts a Roman numeral to an integer.
     * @param roman Roman numeral string, such as `I` or `XII`.
     * @return Parsed integer, or zero for invalid input.
     */
    public static int convertRomanToInteger(String roman) {
        if (roman == null || roman.isEmpty()) {
            return 0;
        }
        return switch (roman.toUpperCase()) {
            case "I" -> 1;
            case "II" -> 2;
            case "III" -> 3;
            case "IV" -> 4;
            case "V" -> 5;
            case "VI" -> 6;
            case "VII" -> 7;
            case "VIII" -> 8;
            case "IX" -> 9;
            case "X" -> 10;
            case "XI" -> 11;
            case "XII" -> 12;
            default -> 0;
        };
    }
}
