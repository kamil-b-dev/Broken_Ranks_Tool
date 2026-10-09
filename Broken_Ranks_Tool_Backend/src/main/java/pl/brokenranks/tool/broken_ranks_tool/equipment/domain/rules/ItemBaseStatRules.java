package pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules;

import java.util.Map;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.SPECIAL_STAT_TYPE;

/** Validates catalogue values before they reach integer star-bonus allocation. */
public final class ItemBaseStatRules {
    private ItemBaseStatRules() {}

    public static void validate(Long itemId, Map<String, Double> stats) {
        if (stats == null) return;
        stats.forEach(
                (name, value) -> {
                    boolean special = SPECIAL_STAT_TYPE.fromDescription(name).isPresent();
                    if (value == null
                            || !Double.isFinite(value)
                            || (!special
                                    && (value != Math.rint(value)
                                            || value < Integer.MIN_VALUE
                                            || value > Integer.MAX_VALUE))) {
                        throw new IllegalArgumentException(
                                "Przedmiot "
                                        + itemId
                                        + " ma nieprawidłową statystykę "
                                        + name
                                        + ": bazowe statystyki muszą być całkowite, a wszystkie wartości skończone.");
                    }
                });
    }
}
