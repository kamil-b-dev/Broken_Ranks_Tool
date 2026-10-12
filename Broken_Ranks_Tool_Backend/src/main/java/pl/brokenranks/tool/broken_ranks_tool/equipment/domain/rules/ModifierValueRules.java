package pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules;

import java.math.BigDecimal;
import java.math.RoundingMode;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;

/** Shared direction, natural usefulness bound and calculator precision for modifiers. */
public final class ModifierValueRules {
    public static final double EPSILON = 0.000001;

    private ModifierValueRules() {}

    public static double directed(DRIF_BONUS_TYPE type, double value) {
        return type.getMaxCap() != null && type.getMaxCap() < 0 ? -value : value;
    }

    public static Double naturalCap(DRIF_BONUS_TYPE type) {
        return type.getMaxCap() == null ? null : (double) Math.abs(type.getMaxCap());
    }

    public static double bounded(double directedValue, Double bound) {
        return bound == null ? directedValue : Math.min(directedValue, bound);
    }

    public static double rounded(double value) {
        return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }

    public static double parse(String value) {
        if (value == null || value.isBlank()) return 0;
        return Double.parseDouble(value.replace("%", "").replace(',', '.').trim());
    }
}
