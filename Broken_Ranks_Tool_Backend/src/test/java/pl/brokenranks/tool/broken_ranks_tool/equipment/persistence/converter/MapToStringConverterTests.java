package pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.converter;

import static org.junit.jupiter.api.Assertions.assertEquals;

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
    void ignoresMalformedEntriesWithoutDroppingValidOnes() {
        assertEquals(
                Map.of("Valid", 3.0),
                converter.convertToEntityAttribute(
                        "Valid:3;missingDelimiter;Invalid:not-a-number"));
    }
}
