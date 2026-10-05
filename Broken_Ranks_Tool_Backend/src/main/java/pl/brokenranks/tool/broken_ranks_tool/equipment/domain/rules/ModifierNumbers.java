package pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules;

import java.math.BigDecimal;
import lombok.experimental.UtilityClass;

/** Parses catalogue modifiers consistently for validation and both calculation models. */
@UtilityClass
public class ModifierNumbers {
    public static BigDecimal decimal(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Brak wartości katalogowej: " + field);
        }
        try {
            BigDecimal parsed = new BigDecimal(value.replace("%", "").replace(",", ".").trim());
            finite(parsed.doubleValue(), field);
            return parsed;
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException(
                    "Niepoprawna wartość katalogowa: " + field, exception);
        }
    }

    public static double parse(String value, String field) {
        return decimal(value, field).doubleValue();
    }

    public static double finite(double value, String field) {
        if (!Double.isFinite(value)) {
            throw new IllegalArgumentException("Nieskończona wartość katalogowa: " + field);
        }
        return value;
    }
}
