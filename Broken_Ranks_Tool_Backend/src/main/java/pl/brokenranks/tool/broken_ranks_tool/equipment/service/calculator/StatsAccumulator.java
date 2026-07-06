package pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator;

import pl.brokenranks.tool.broken_ranks_tool.core.utils.RandomProvider;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

/**
 * Klasa pomocnicza odpowiedzialna za akumulację i obliczanie statystyk.
 * Przechowuje statystyki w postaci płaskiej i procentowej, a na końcu je formatuje.
 * Nie jest komponentem Springa - nowa instancja jest tworzona dla każdego obliczenia.
 */
public class StatsAccumulator {
    private final Map<String, Double> flatStats = new HashMap<>();
    private final Map<String, Double> percentStats = new HashMap<>();

    /**
     * Dodaje wartość statystyki na podstawie surowego stringa (np. "10%" lub "25").
     * Automatycznie parsuje wartość i decyduje, czy jest to statystyka płaska czy procentowa.
     *
     * @param statName   Nazwa statystyki.
     * @param rawValue   Surowa wartość w postaci stringa.
     * @param multiplier Mnożnik, przez który zostanie przemnożona wartość.
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
        } catch (NumberFormatException ignored) {}
    }

    /**
     * Dodaje płaską wartość do statystyk.
     *
     * @param statName Nazwa statystyki.
     * @param value    Wartość do dodania.
     */
    public void addFlatValue(String statName, double value) {
        flatStats.merge(statName, value, Double::sum);
    }

    /**
     * Rozdziela pulę bonusowych punktów statystyk losowo pomiędzy podane statystyki bazowe.
     *
     * @param baseValues     Mapa statystyk bazowych do rozdzielenia.
     * @param multiplier     Mnożnik, który określa wielkość puli bonusowej.
     * @param randomProvider Dostawca losowości.
     */
    public void distributeRandomly(Map<String, Integer> baseValues, double multiplier, RandomProvider randomProvider) {
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
     * Formatuje zebrane statystyki do ostatecznej, czytelnej formy.
     * Używa {@link BigDecimal} do precyzyjnego zaokrąglania.
     *
     * @return Mapa sformatowanych statystyk gotowa do wyświetlenia.
     */
    public Map<String, String> getFormattedResults() {
        Map<String, String> finalStats = new HashMap<>();

        flatStats.forEach((stat, val) -> finalStats.put(stat, formatValue(val, false)));
        percentStats.forEach((stat, val) -> finalStats.put(stat, formatValue(val, true)));

        return finalStats;
    }

    private String formatValue(double value, boolean isPercent) {
        BigDecimal bd = BigDecimal.valueOf(value)
                .setScale(2, RoundingMode.HALF_UP)
                .stripTrailingZeros();
        String formatted = bd.toPlainString();
        return isPercent ? formatted + "%" : formatted;
    }
}
