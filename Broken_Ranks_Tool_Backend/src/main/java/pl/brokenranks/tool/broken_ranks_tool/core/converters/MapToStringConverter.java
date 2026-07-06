package pl.brokenranks.tool.broken_ranks_tool.core.converters;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Konwerter atrybutów JPA, który konwertuje obiekt {@link Map} na {@link String} i z powrotem.
 * Umożliwia przechowywanie mapy w pojedynczej kolumnie tekstowej w bazie danych.
 * Adnotacja {@link Converter} nie ma ustawionego {@code autoApply = true}, więc musi być
 * jawnie zadeklarowana nad polem w encji, np. {@code @Convert(converter = MapToStringConverter.class)}.
 */
@Converter
public class MapToStringConverter implements AttributeConverter<Map<String, Double>, String> {

    private static final String DELIMITER_ENTRY = ";";
    private static final String DELIMITER_KEY_VALUE = ":";

    /**
     * Konwertuje mapę na pojedynczy string w celu zapisu do bazy danych.
     * Format: "klucz1:wartość1;klucz2:wartość2"
     *
     * @param attribute Mapa do konwersji.
     * @return Sformatowany string lub pusty string, jeśli mapa jest pusta/null.
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
     * Konwertuje string z bazy danych z powrotem na obiekt mapy.
     *
     * @param dbData Dane w formacie string z bazy danych.
     * @return Zrekonstruowana mapa lub pusta mapa, jeśli dane są puste/null.
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
