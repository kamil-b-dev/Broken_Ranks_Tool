package pl.brokenranks.tool.broken_ranks_tool.equipment.domain.util;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class RomanNumeralParserTests {

    @Test
    void convertsSupportedNumeralsCaseInsensitively() {
        assertEquals(1, RomanNumeralParser.convertRomanToInteger("i"));
        assertEquals(4, RomanNumeralParser.convertRomanToInteger("IV"));
        assertEquals(9, RomanNumeralParser.convertRomanToInteger("ix"));
        assertEquals(12, RomanNumeralParser.convertRomanToInteger("XII"));
    }

    @Test
    void returnsZeroForMissingOrUnsupportedNumeral() {
        assertEquals(0, RomanNumeralParser.convertRomanToInteger(null));
        assertEquals(0, RomanNumeralParser.convertRomanToInteger(""));
        assertEquals(0, RomanNumeralParser.convertRomanToInteger("XIII"));
    }
}
