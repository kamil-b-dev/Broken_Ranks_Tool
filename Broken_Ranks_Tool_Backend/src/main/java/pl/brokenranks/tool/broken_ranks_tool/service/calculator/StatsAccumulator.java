package pl.brokenranks.tool.broken_ranks_tool.service.calculator;

import java.util.*;

public class StatsAccumulator {
    private final Map<String, Double> flatStats = new HashMap<>();
    private final Map<String, Double> percentStats = new HashMap<>();

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
        } catch (NumberFormatException ignored) {}
    }

    public void addFlatValue(String statName, double value) {
        flatStats.merge(statName, value, Double::sum);
    }

    public void distributeRandomly(Map<String, Integer> baseValues, double multiplier) {
        if (baseValues.isEmpty()) return;

        int totalBase = baseValues.values().stream().mapToInt(Integer::intValue).sum();
        int bonusPool = (int) Math.round(totalBase * multiplier);

        Map<String, Integer> finalValues = new HashMap<>(baseValues);
        List<String> keys = new ArrayList<>(baseValues.keySet());
        Random random = new Random();

        for (int i = 0; i < bonusPool; i++) {
            String randomKey = keys.get(random.nextInt(keys.size()));
            finalValues.put(randomKey, finalValues.get(randomKey) + 1);
        }

        finalValues.forEach((stat, val) -> addFlatValue(stat, (double) val));
    }

    public Map<String, String> getFormattedResults() {
        Map<String, String> finalStats = new HashMap<>();
        flatStats.forEach((stat, val) -> finalStats.put(stat, String.valueOf(Math.round(val))));
        percentStats.forEach((stat, val) -> {
            String format = (val == (long) val.doubleValue()) ? "%d%%" : "%s%%";
            finalStats.put(stat, String.format(format, (long) val.doubleValue()).replace(",", "."));
        });
        return finalStats;
    }
}