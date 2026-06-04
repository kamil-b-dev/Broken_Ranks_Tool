package pl.brokenranks.tool.broken_ranks_tool.core.converters;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

@Converter
public class MapToStringConverter implements AttributeConverter<Map<String, Double>, String> {

    @Override
    public String convertToDatabaseColumn(Map<String, Double> attribute) {
        if (attribute == null || attribute.isEmpty()) return "";
        return attribute.entrySet().stream()
                .map(entry -> entry.getKey() + ":" + entry.getValue())
                .collect(Collectors.joining(";"));
    }

    @Override
    public Map<String, Double> convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isEmpty()) return new HashMap<>();
        Map<String, Double> map = new HashMap<>();
        String[] entries = dbData.split(";");
        for (String entry : entries) {
            String[] kv = entry.split(":");
            if (kv.length == 2) {
                String cleanValue = kv[1].replace("%", "").replace(",", ".").trim();
                try {
                    map.put(kv[0], Double.parseDouble(cleanValue));
                } catch (NumberFormatException e) {
                }
            }
        }
        return map;
    }
}