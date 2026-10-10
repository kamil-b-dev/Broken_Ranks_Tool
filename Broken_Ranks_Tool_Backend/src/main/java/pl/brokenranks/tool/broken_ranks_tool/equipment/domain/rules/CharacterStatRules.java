package pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules;

import java.util.EnumMap;
import java.util.Map;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.STAT_TYPE;

/** Validates individual and canonical totals for character base statistics. */
public final class CharacterStatRules {
    public static final int MAX_CHARACTER_STAT = 50_000;

    private CharacterStatRules() {}

    public static void validate(Map<String, Integer> stats) {
        if (stats == null) return;
        Map<STAT_TYPE, Integer> totals = new EnumMap<>(STAT_TYPE.class);
        stats.forEach(
                (key, value) -> {
                    if (!STAT_TYPE.isValid(key)
                            || value == null
                            || value < 0
                            || value > MAX_CHARACTER_STAT) {
                        throw new IllegalArgumentException(
                                "Wykryto nieprawidłową statystykę postaci: "
                                        + key
                                        + ". Wartość musi mieścić się w zakresie 0–50 000.");
                    }
                    STAT_TYPE type = STAT_TYPE.fromDescription(key).orElseThrow();
                    if (totals.merge(type, value, Integer::sum) > MAX_CHARACTER_STAT) {
                        throw new IllegalArgumentException(
                                "Łączna wartość statystyki postaci "
                                        + type.getDescription()
                                        + " musi mieścić się w zakresie 0–50 000.");
                    }
                });
    }
}
