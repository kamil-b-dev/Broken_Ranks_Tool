package pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.random.RandomProvider;

/** Accumulates flat and percentage statistics for one calculation. */
public class StatsAccumulator {
    private final Map<String, Double> flatStats = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
    private final Map<String, Double> percentStats = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);

    /**
     * Adds a raw statistic value, automatically handling flat and percentage formats.
     * @param statName Business statistic name.
     * @param rawValue Raw value such as `10%` or `25`.
     * @param multiplier Value multiplier applied before accumulation.
     */
    public void addRawValue(String statName, String rawValue, double multiplier) {
        if (rawValue == null || rawValue.isBlank()) return;

        boolean isPercent = rawValue.contains("%");
        String cleanValue = rawValue.replace("%", "").replace(",", ".").trim();

        try {
            double parsedValue = Double.parseDouble(cleanValue);
            double totalValue = parsedValue * multiplier;

            if (isPercent) {
                percentStats.merge(statName, totalValue, Double::sum);
            } else {
                flatStats.merge(statName, totalValue, Double::sum);
            }
        } catch (NumberFormatException ignored) {
        }
    }

    /**
     * Adds a flat value to a statistic.
     * @param statName Business statistic name.
     * @param value Flat value to add.
     */
    public void addFlatValue(String statName, double value) {
        flatStats.merge(statName, value, Double::sum);
    }

    /**
     * Distributes a bonus pool randomly across the supplied base statistics.
     * @param baseValues Base statistics receiving the pool.
     * @param multiplier Multiplier determining pool size.
     * @param randomProvider Random source used for distribution.
     */
    public void distributeRandomly(
            Map<String, Integer> baseValues, double multiplier, RandomProvider randomProvider) {
        if (baseValues.isEmpty()) return;

        int totalBase = baseValues.values().stream().mapToInt(Integer::intValue).sum();
        int bonusPool = (int) Math.round(totalBase * multiplier);

        Map<String, Integer> finalValues = new HashMap<>(baseValues);
        List<String> keys = new ArrayList<>(baseValues.keySet());

        for (int i = 0; i < bonusPool; i++) {
            String randomKey = keys.get(randomProvider.nextInt(keys.size()));
            finalValues.put(randomKey, finalValues.get(randomKey) + 1);
        }

        finalValues.forEach((stat, val) -> addFlatValue(stat, (double) val));
    }

    /**
     * Formats accumulated statistics for display using precise decimal rounding.
     * @return Display-ready statistics map.
     */
    public Map<String, String> getFormattedResults() {
        Map<String, String> finalStats = new HashMap<>();

        flatStats.forEach((stat, val) -> finalStats.put(stat, formatValue(val, false)));
        percentStats.forEach((stat, val) -> finalStats.put(stat, formatValue(val, true)));

        return finalStats;
    }

    private String formatValue(double value, boolean isPercent) {
        BigDecimal bd =
                BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP).stripTrailingZeros();
        String formatted = bd.toPlainString();
        return isPercent ? formatted + "%" : formatted;
    }
}
