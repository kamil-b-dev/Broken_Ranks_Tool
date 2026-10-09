package pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules;

import java.math.BigDecimal;
import java.math.RoundingMode;
import org.springframework.stereotype.Component;

/** Calculates a drif value at a selected upgrade level. */
@Component
public class DrifValueCalculator {

    public String calculate(String baseValue, String incrementValue, int level) {
        BigDecimal total = ModifierNumbers.decimal(baseValue, "drif.baseValue");
        BigDecimal increment = ModifierNumbers.decimal(incrementValue, "drif.increment");
        boolean percentage = baseValue.contains("%") || incrementValue.contains("%");
        for (int currentLevel = 2; currentLevel <= level; currentLevel++) {
            total = total.add(currentLevel >= 19 ? increment.multiply(BigDecimal.TWO) : increment);
        }
        ModifierNumbers.finite(total.doubleValue(), "wynik drifa");
        String result =
                total.setScale(2, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
        return percentage ? result + "%" : result;
    }
}
