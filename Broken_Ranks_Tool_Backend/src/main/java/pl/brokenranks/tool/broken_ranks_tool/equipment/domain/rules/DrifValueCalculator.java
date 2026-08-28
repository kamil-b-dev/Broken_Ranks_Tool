package pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules;

import java.math.BigDecimal;
import java.math.RoundingMode;
import org.springframework.stereotype.Component;

/** Calculates a drif value at a selected upgrade level. */
@Component
public class DrifValueCalculator {

    public String calculate(String baseValue, String incrementValue, int level) {
        if (baseValue == null || incrementValue == null) return "0";
        boolean percentage = baseValue.contains("%") || incrementValue.contains("%");
        try {
            BigDecimal total = parse(baseValue);
            BigDecimal increment = parse(incrementValue);
            for (int currentLevel = 2; currentLevel <= level; currentLevel++) {
                total =
                        total.add(
                                currentLevel >= 19
                                        ? increment.multiply(BigDecimal.TWO)
                                        : increment);
            }
            String result =
                    total.setScale(2, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
            return percentage ? result + "%" : result;
        } catch (NumberFormatException exception) {
            return "0";
        }
    }

    private BigDecimal parse(String value) {
        return new BigDecimal(value.replace(",", ".").replace("%", "").trim());
    }
}
