package pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator;

import static org.junit.jupiter.api.Assertions.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;

class NumericStatsTests {
    @Test
    void numericAndFormattedPathsHaveTheSameRoundingAndUnits() {
        StatsAccumulator accumulator = new StatsAccumulator();
        accumulator.addRawValue("MANA_USAGE_REDUCTION", "-12,345%", 1);
        accumulator.addFlatValue("Siła", 17.005);
        assertEquals(
                accumulator.getFormattedResults(),
                accumulator.getRoundedNumericResults().formatted());
        assertEquals(
                -12.35,
                accumulator.getRoundedNumericResults().values().get("MANA_USAGE_REDUCTION"));
        assertEquals(
                Map.of("CRITICAL_CHANCE", "2%", "Siła", "17"),
                NumericStats.fromFormatted(Map.of("CRITICAL_CHANCE", "+2%", "Siła", "17"))
                        .formatted());
    }

    @Test
    void numericSnapshotsAreDetachedAndImmutable() {
        Map<String, Double> values = new HashMap<>(Map.of("stat", 1.0));
        NumericStats stats = new NumericStats(values, Set.of());
        values.put("stat", 9.0);
        assertEquals(1.0, stats.values().get("stat"));
        assertThrows(UnsupportedOperationException.class, () -> stats.values().put("stat", 3.0));
    }
}
