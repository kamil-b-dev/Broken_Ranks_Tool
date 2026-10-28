package pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules;

import static org.junit.jupiter.api.Assertions.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
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

    @ParameterizedTest
    @CsvSource(
            value = {
                "2%|0.5%", " -2,5% | -0,5% ", "0|0", "0.005|0.0004",
                "-0.005|-0.0004", "1.2345%|-0.04567", "1E+2|2E-3", "9E+307|-1E+306"
            },
            delimiter = '|')
    void matchesAnIterativeDecimalOracleForEverySupportedLevel(String base, String increment) {
        BigDecimal expected = new BigDecimal(base.replace("%", "").replace(',', '.').trim());
        BigDecimal step = new BigDecimal(increment.replace("%", "").replace(',', '.').trim());
        boolean percentage = base.contains("%") || increment.contains("%");
        for (int level = 1; level <= 21; level++) {
            if (level > 1) {
                expected = expected.add(step);
                if (level >= 19) expected = expected.add(step);
            }
            BigDecimal rounded = expected.setScale(2, RoundingMode.HALF_UP);
            assertEquals(
                    rounded.doubleValue(),
                    DrifValueCalculator.calculateNumeric(base, increment, level));
            assertEquals(
                    rounded.stripTrailingZeros().toPlainString() + (percentage ? "%" : ""),
                    calculator.calculate(base, increment, level));
        }
    }
}
