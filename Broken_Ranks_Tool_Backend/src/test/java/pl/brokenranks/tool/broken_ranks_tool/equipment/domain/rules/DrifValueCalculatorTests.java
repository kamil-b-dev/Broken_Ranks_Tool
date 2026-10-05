package pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

class DrifValueCalculatorTests {
    private final DrifValueCalculator calculator = new DrifValueCalculator();

    @Test
    void keepsNegativeLocalizedPercentagesAndDoubledLastLevelIncrements() {
        assertEquals("-14%", calculator.calculate(" -2,5% ", " -0,5% ", 21));
        assertEquals("0", calculator.calculate("0", "0", 21));
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "bad", "NaN", "Infinity", "-Infinity", "1e309"})
    void neverConvertsInvalidCatalogDataIntoAZeroBonus(String value) {
        assertThrows(IllegalArgumentException.class, () -> calculator.calculate(value, "1%", 6));
        assertThrows(IllegalArgumentException.class, () -> calculator.calculate("1%", value, 6));
    }

    @Test
    void rejectsFiniteInputsWhoseCalculatedTotalOverflowsTheSearchNumberRange() {
        assertThrows(
                IllegalArgumentException.class, () -> calculator.calculate("1e308", "1e308", 21));
    }
}
