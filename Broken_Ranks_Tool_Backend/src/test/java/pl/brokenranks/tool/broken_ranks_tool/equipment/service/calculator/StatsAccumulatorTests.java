package pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;

class StatsAccumulatorTests {

    @Test
    void parsesFlatAndPercentageValuesAndFormatsThem() {
        StatsAccumulator accumulator = new StatsAccumulator();

        accumulator.addRawValue("Damage", "10,25%", 2.0);
        accumulator.addRawValue("Armor", "3", 1.0);
        accumulator.addFlatValue("Armor", 1.5);

        assertEquals("20.5%", accumulator.getFormattedResults().get("Damage"));
        assertEquals("4.5", accumulator.getFormattedResults().get("Armor"));
    }

    @Test
    void rejectsMalformedValuesInsteadOfSilentlyDroppingThem() {
        StatsAccumulator accumulator = new StatsAccumulator();

        assertThrows(
                IllegalArgumentException.class,
                () -> accumulator.addRawValue("Armor", "not-a-number", 1.0));
    }

    @Test
    void distributesTheRoundedBonusPoolEvenlyInStableOrder() {
        StatsAccumulator accumulator = new StatsAccumulator();

        Map<String, Integer> baseValues = new LinkedHashMap<>();
        baseValues.put("Power", 2);
        baseValues.put("Strength", 1);
        accumulator.distributeBonusDeterministically(baseValues, 1.0);

        assertEquals(Map.of("Strength", "2", "Power", "4"), accumulator.getFormattedResults());
    }

    @Test
    void producesTheSameDistributionRegardlessOfInputMapOrder() {
        StatsAccumulator first = new StatsAccumulator();
        StatsAccumulator second = new StatsAccumulator();

        first.distributeBonusDeterministically(
                new LinkedHashMap<>(Map.of("Siła", 10, "Moc", 10, "Wiedza", 10)), 0.2);
        Map<String, Integer> reversed = new LinkedHashMap<>();
        reversed.put("Wiedza", 10);
        reversed.put("Siła", 10);
        reversed.put("Moc", 10);
        second.distributeBonusDeterministically(reversed, 0.2);

        assertEquals(first.getFormattedResults(), second.getFormattedResults());
        assertEquals(
                36,
                first.getNumericResults().values().stream().mapToDouble(Double::doubleValue).sum());
    }

    @Test
    void ignoresEmptyDistribution() {
        StatsAccumulator accumulator = new StatsAccumulator();

        accumulator.distributeBonusDeterministically(Map.of(), 2.0);

        assertEquals(Map.of(), accumulator.getFormattedResults());
    }
}
