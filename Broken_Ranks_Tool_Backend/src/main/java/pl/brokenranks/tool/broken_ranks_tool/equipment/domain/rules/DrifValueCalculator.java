package pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules;

import java.math.BigDecimal;
import java.math.RoundingMode;
import org.springframework.stereotype.Component;

/** Calculates a drif value at a selected upgrade level. */
@Component
public class DrifValueCalculator {

    public String calculate(String baseValue, String incrementValue, int level) {
        BigDecimal value = calculateDecimal(baseValue, incrementValue, level);
        boolean percentage = baseValue.contains("%") || incrementValue.contains("%");
        String result = value.stripTrailingZeros().toPlainString();
        return percentage ? result + "%" : result;
    }

    public static double calculateNumeric(String baseValue, String incrementValue, int level) {
        return calculateDecimal(baseValue, incrementValue, level).doubleValue();
    }

    private static BigDecimal calculateDecimal(String baseValue, String incrementValue, int level) {
        BigDecimal total = ModifierNumbers.decimal(baseValue, "drif.baseValue");
        BigDecimal increment = ModifierNumbers.decimal(incrementValue, "drif.increment");
        for (int currentLevel = 2; currentLevel <= level; currentLevel++) {
            total = total.add(currentLevel >= 19 ? increment.multiply(BigDecimal.TWO) : increment);
        }
        ModifierNumbers.finite(total.doubleValue(), "wynik drifa");
        return total.setScale(2, RoundingMode.HALF_UP);
    }
}
