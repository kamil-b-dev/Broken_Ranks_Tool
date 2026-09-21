package pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.converter;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.Map;
import org.junit.jupiter.api.Test;

class MapToStringConverterTests {

    private final MapToStringConverter converter = new MapToStringConverter();

    @Test
    void convertsMapToDatabaseAndBackIncludingLocalizedPercentValues() {
        String databaseValue =
                converter.convertToDatabaseColumn(Map.of("Damage", 12.5, "Armor", 4.0));

        assertEquals(
                Map.of("Damage", 12.5, "Armor", 4.0),
                converter.convertToEntityAttribute(databaseValue));
        assertEquals(Map.of("Damage", 12.5), converter.convertToEntityAttribute("Damage:12,5%"));
    }

    @Test
    void usesEmptyRepresentationsForNullOrEmptyValues() {
        assertEquals("", converter.convertToDatabaseColumn(null));
        assertEquals("", converter.convertToDatabaseColumn(Map.of()));
        assertEquals(Map.of(), converter.convertToEntityAttribute(null));
        assertEquals(Map.of(), converter.convertToEntityAttribute(""));
    }

    @Test
    void rejectsMalformedEntriesInsteadOfSilentlyDroppingStats() {
        assertThrows(
                IllegalArgumentException.class,
                () -> converter.convertToEntityAttribute("Valid:3;missingDelimiter"));
        assertThrows(
                IllegalArgumentException.class,
                () -> converter.convertToEntityAttribute("Invalid:not-a-number"));
    }

    @Test
    void splitsOnlyOnTheFirstKeyValueDelimiter() {
        assertThrows(
                IllegalArgumentException.class,
                () -> converter.convertToEntityAttribute("Damage:physical:12"));
    }
}
