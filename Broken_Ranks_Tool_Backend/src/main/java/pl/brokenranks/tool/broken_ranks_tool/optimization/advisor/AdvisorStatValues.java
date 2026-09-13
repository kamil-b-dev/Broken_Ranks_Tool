package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import java.util.Map;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;

/** Converts calculator output into the numeric representation used by advisor search. */
final class AdvisorStatValues {
    static final DRIF_BONUS_TYPE[] TYPES = DRIF_BONUS_TYPE.values();

    private AdvisorStatValues() {}

    static double parse(String value) {
        if (value == null) return 0;
        return Double.parseDouble(value.replace("%", "").replace(',', '.').trim());
    }

    static double[] numeric(Map<String, Double> stats) {
        double[] result = new double[TYPES.length];
        for (var type : TYPES) result[type.ordinal()] = stats.getOrDefault(type.name(), 0.0);
        return result;
    }

    static double[] parsed(Map<String, String> stats) {
        double[] result = new double[TYPES.length];
        for (var type : TYPES) result[type.ordinal()] = parse(stats.get(type.name()));
        return result;
    }

    static double directed(DRIF_BONUS_TYPE type, double value) {
        return type.getMaxCap() != null && type.getMaxCap() < 0 ? -value : value;
    }
}
