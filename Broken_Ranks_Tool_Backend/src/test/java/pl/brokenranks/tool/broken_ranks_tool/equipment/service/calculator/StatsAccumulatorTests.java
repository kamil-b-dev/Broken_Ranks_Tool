package pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.StatContributionDto;

class StatsAccumulatorTests {

    @ParameterizedTest
    @CsvSource({"2.35, true, 1.15", "-2.35, true, 0.95", "0, false, 1", "12.34, false, 1.08"})
    void numericValuesPreserveFormattedResultsRoundingAndExplanation(
            double value, boolean percentage, double multiplier) {
        var numeric = new StatsAccumulator(true);
        var text = new StatsAccumulator(true);
        var source = StatContributionDto.Source.builder().kind("DRIF").build();
        numeric.setSource(source);
        text.setSource(source);
        numeric.addNumericValue("Bonus", value, percentage, multiplier);
        text.addRawValue("Bonus", value + (percentage ? "%" : ""), multiplier);
        assertEquals(text.getNumericResults(), numeric.getNumericResults());
        assertEquals(text.getFormattedResults(), numeric.getFormattedResults());
        assertEquals(text.getContributions(), numeric.getContributions());
    }

    @Test
    void numericValuesRejectNonFiniteProductsAndOverflowWithoutChangingPreviousValues() {
        var accumulator = new StatsAccumulator();
        accumulator.addNumericValue("Bonus", Double.MAX_VALUE, true, 1);
        for (double invalid :
                new double[] {Double.NaN, Double.POSITIVE_INFINITY, Double.NEGATIVE_INFINITY}) {
            assertThrows(
                    IllegalArgumentException.class,
                    () -> accumulator.addNumericValue("Bonus", invalid, true, 1));
            assertThrows(
                    IllegalArgumentException.class,
                    () -> accumulator.addNumericValue("Bonus", 1, true, invalid));
        }
        assertThrows(
                IllegalArgumentException.class,
                () -> accumulator.addNumericValue("Bonus", Double.MAX_VALUE, true, 2));
        assertThrows(
                IllegalArgumentException.class,
                () -> accumulator.addNumericValue("Bonus", Double.MAX_VALUE, true, 1));
        assertEquals(Map.of("Bonus", Double.MAX_VALUE), accumulator.getNumericResults());
    }

    @Test
    void rejectsNonFiniteValuesAndAccumulationOverflowWithoutCorruptingTheSnapshot() {
        var accumulator = new StatsAccumulator();
        for (double value :
                new double[] {Double.NaN, Double.POSITIVE_INFINITY, Double.NEGATIVE_INFINITY}) {
            assertThrows(
                    IllegalArgumentException.class, () -> accumulator.addFlatValue("Armor", value));
            assertThrows(
                    IllegalArgumentException.class,
                    () -> accumulator.addRawValue("Armor", "1", value));
        }
        assertThrows(
                IllegalArgumentException.class, () -> accumulator.addRawValue("Armor", "NaN%", 1));
        assertThrows(
                IllegalArgumentException.class,
                () -> accumulator.addRawValue("Armor", "1e308", 100));
        accumulator.addFlatValue("Armor", Double.MAX_VALUE);
        assertThrows(
                IllegalArgumentException.class,
                () -> accumulator.addFlatValue("Armor", Double.MAX_VALUE));
        assertEquals(Map.of("Armor", Double.MAX_VALUE), accumulator.getNumericResults());
    }

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
