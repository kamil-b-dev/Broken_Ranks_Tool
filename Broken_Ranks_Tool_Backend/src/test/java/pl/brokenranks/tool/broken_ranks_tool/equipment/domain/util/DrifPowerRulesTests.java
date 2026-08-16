package pl.brokenranks.tool.broken_ranks_tool.equipment.domain.util;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.function.Function;
import java.util.stream.IntStream;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;

class DrifPowerRulesTests {

    @ParameterizedTest(name = "level {0} uses multiplier {1}")
    @MethodSource("multiplierRanges")
    void usesTheExpectedMultiplierForEveryLevelInRange(int level, int expectedMultiplier) {
        assertEquals(expectedMultiplier, DrifPowerRules.effectiveMultiplier(level));
    }

    private static Stream<Arguments> multiplierRanges() {
        return Stream.of(
                levelsFromTo(1, 6, 1),
                levelsFromTo(7, 11, 2),
                levelsFromTo(12, 16, 3),
                levelsFromTo(17, 21, 4)
        ).flatMap(Function.identity());
    }

    private static Stream<Arguments> levelsFromTo(int first, int last, int multiplier) {
        return IntStream.rangeClosed(first, last)
                .mapToObj(level -> Arguments.of(level, multiplier));
    }

    @Test
    void calculatesCapacityPowerFromBasePower() {
        assertEquals(60, DrifPowerRules.power(20, 12));
    }
}
