package pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.converter;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

/** Converts maps to a single database column because SQLite lacks native JSON types. */
@Converter
public class MapToStringConverter implements AttributeConverter<Map<String, Double>, String> {

    private static final String DELIMITER_ENTRY = ";";
    private static final String DELIMITER_KEY_VALUE = ":";

    /**
     * Converts a map to its database string representation.
     * @param attribute Map to serialize.
     * @return Database string, or an empty string for null or empty input.
     */
    @Override
    public String convertToDatabaseColumn(Map<String, Double> attribute) {
        if (attribute == null || attribute.isEmpty()) {
            return "";
        }
        return attribute.entrySet().stream()
                .map(entry -> entry.getKey() + DELIMITER_KEY_VALUE + entry.getValue())
                .collect(Collectors.joining(DELIMITER_ENTRY));
    }

    /**
     * Reconstructs a map from its database string representation.
     * @param dbData Stored database value.
     * @return Reconstructed map, or an empty map for null or empty input.
     */
    @Override
    public Map<String, Double> convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isEmpty()) {
            return new HashMap<>();
        }
        Map<String, Double> map = new HashMap<>();
        String[] entries = dbData.split(DELIMITER_ENTRY);
        for (String entry : entries) {
            String[] kv = entry.split(DELIMITER_KEY_VALUE);
            if (kv.length == 2) {
                String cleanValue = kv[1].replace("%", "").replace(",", ".").trim();
                try {
                    map.put(kv[0], Double.parseDouble(cleanValue));
                } catch (NumberFormatException ignored) {
                    // Ignoruje błędnie sformatowane wpisy
                }
            }
        }
        return map;
    }
}
