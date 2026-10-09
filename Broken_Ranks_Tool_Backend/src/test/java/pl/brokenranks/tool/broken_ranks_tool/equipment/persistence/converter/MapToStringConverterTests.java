package pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.converter;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class MapToStringConverterTests {

    private final MapToStringConverter converter = new MapToStringConverter();

    @ParameterizedTest
    @ValueSource(doubles = {Double.NaN, Double.POSITIVE_INFINITY, Double.NEGATIVE_INFINITY})
    void rejectsNonFiniteStatisticsOnReadAndWrite(double value) {
        assertThrows(
                IllegalArgumentException.class,
                () -> converter.convertToDatabaseColumn(Map.of("Damage", value)));
        assertThrows(
                IllegalArgumentException.class,
                () -> converter.convertToEntityAttribute("Damage:" + value));
    }

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
