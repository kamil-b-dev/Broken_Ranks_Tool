package pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.ModifierValueRules;

/** Rounded authoritative values remain numeric until they cross a display/API boundary. */
public record NumericStats(Map<String, Double> values, Set<String> percentageStats) {
    public NumericStats {
        values = Map.copyOf(values);
        percentageStats = Set.copyOf(percentageStats);
    }

    public Map<String, String> formatted() {
        Map<String, String> result = new HashMap<>();
        values.forEach(
                (key, value) ->
                        result.put(
                                key,
                                BigDecimal.valueOf(value).stripTrailingZeros().toPlainString()
                                        + (percentageStats.contains(key) ? "%" : "")));
        return result;
    }

    public static NumericStats fromFormatted(Map<String, String> values) {
        Map<String, Double> numeric = new HashMap<>();
        Set<String> percentages = new HashSet<>();
        values.forEach(
                (key, value) -> {
                    numeric.put(key, ModifierValueRules.parse(value));
                    if (value != null && value.contains("%")) percentages.add(key);
                });
        return new NumericStats(numeric, percentages);
    }
}
