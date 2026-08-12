package pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.Arrays;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Reprezentuje specjalne typy statystyk, które nie podlegają
 * standardowemu przetwarzaniu (np. losowej dystrybucji).
 */
@Getter
@AllArgsConstructor
public enum SPECIAL_STAT_TYPE {
    DRIF_BONUS("Bonus drify"),
    ORB_BONUS("Bonus orby"),
    CAPACITY("Pojemność"),
    ADDITIONAL_AP("Dodatkowe PA"),
    ADDITIONAL_ATTACK_CYCLE("Dodatkowe kółko ataku");

    private final String description;

    private static final Map<String, SPECIAL_STAT_TYPE> LOOKUP_MAP = Arrays.stream(values())
            .collect(Collectors.toMap(
                    s -> s.getDescription().toLowerCase(),
                    Function.identity()
            ));

    /**
     * Bezpiecznie konwertuje string na odpowiedni typ enuma.
     * Wyszukiwanie ignoruje wielkość liter.
     *
     * @param description Polska nazwa statystyki.
     * @return Optional zawierający znaleziony typ lub pusty, jeśli nazwa jest nieprawidłowa.
     */
    public static Optional<SPECIAL_STAT_TYPE> fromDescription(String description) {
        if (description == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(LOOKUP_MAP.get(description.toLowerCase()));
    }
}
