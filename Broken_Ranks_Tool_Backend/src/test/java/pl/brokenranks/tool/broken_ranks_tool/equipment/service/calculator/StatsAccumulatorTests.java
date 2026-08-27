package pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.random.RandomProvider;

class StatsAccumulatorTests {

    @Test
    void parsesFlatAndPercentageValuesAndFormatsThem() {
        StatsAccumulator accumulator = new StatsAccumulator();

        accumulator.addRawValue("Damage", "10,25%", 2.0);
        accumulator.addRawValue("Armor", "3", 1.0);
        accumulator.addRawValue("Armor", "not-a-number", 1.0);
        accumulator.addFlatValue("Armor", 1.5);

        assertEquals("20.5%", accumulator.getFormattedResults().get("Damage"));
        assertEquals("4.5", accumulator.getFormattedResults().get("Armor"));
    }

    @Test
    void distributesRoundedBonusPoolUsingInjectedRandomProvider() {
        StatsAccumulator accumulator = new StatsAccumulator();
        RandomProvider firstKeyProvider =
                new RandomProvider() {
                    @Override
                    public int nextInt(int bound) {
                        return 0;
                    }

                    @Override
                    public double nextDouble() {
                        return 0.0;
                    }
                };

        Map<String, Integer> baseValues = new LinkedHashMap<>();
        baseValues.put("Strength", 1);
        baseValues.put("Power", 2);
        accumulator.distributeRandomly(baseValues, 1.0, firstKeyProvider);

        assertEquals(Map.of("Strength", "4", "Power", "2"), accumulator.getFormattedResults());
    }

    @Test
    void ignoresEmptyDistribution() {
        StatsAccumulator accumulator = new StatsAccumulator();

        accumulator.distributeRandomly(
                Map.of(),
                2.0,
                new RandomProvider() {
                    @Override
                    public int nextInt(int bound) {
                        return 0;
                    }

                    @Override
                    public double nextDouble() {
                        return 0.0;
                    }
                });

        assertEquals(Map.of(), accumulator.getFormattedResults());
    }
}
