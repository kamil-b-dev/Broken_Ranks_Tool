package pl.brokenranks.tool.broken_ranks_tool.entity.converters;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

@Converter
public class MapToStringConverter implements AttributeConverter<Map<String, Integer>, String> {

    @Override
    public String convertToDatabaseColumn(Map<String, Integer> attribute) {
        if (attribute == null || attribute.isEmpty()) return "";
        return attribute.entrySet().stream()
                .map(entry -> entry.getKey() + ":" + entry.getValue())
                .collect(Collectors.joining(";"));
    }

    @Override
    public Map<String, Integer> convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isEmpty()) return new HashMap<>();
        Map<String, Integer> map = new HashMap<>();
        String[] entries = dbData.split(";");
        for (String entry : entries) {
            String[] kv = entry.split(":");
            if (kv.length == 2) {
                map.put(kv[0], Integer.parseInt(kv[1]));
            }
        }
        return map;
    }
}