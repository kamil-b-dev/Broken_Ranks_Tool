package pl.brokenranks.tool.broken_ranks_tool.core.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.util.Arrays;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Reprezentuje wszystkie dozwolone typy statystyk bazowych i głównych,
 * zapewniając mechanizm do walidacji i normalizacji nazw.
 */
@Getter
@RequiredArgsConstructor
public enum STAT_TYPE {
    STRENGTH("Siła"),
    DEXTERITY("Zręczność"),
    POWER("Moc"),
    KNOWLEDGE("Wiedza"),
    HEALTH("PŻ"),
    MANA("Mana"),
    STAMINA("Kondycja"),
    DAMAGE("Obrażenia");

    private final String description;

    private static final Map<String, STAT_TYPE> LOOKUP_MAP = Arrays.stream(values())
            .collect(Collectors.toMap(
                    s -> s.getDescription().toLowerCase(),
                    Function.identity()
            ));

    /**
     * Bezpiecznie konwertuje string (np. z bazy danych lub API) na odpowiedni typ enuma.
     * Wyszukiwanie ignoruje wielkość liter.
     *
     * @param description Polska nazwa statystyki (np. "Siła", "PŻ").
     * @return Optional zawierający znaleziony STAT_TYPE lub pusty, jeśli nazwa jest nieprawidłowa.
     */
    public static Optional<STAT_TYPE> fromDescription(String description) {
        if (description == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(LOOKUP_MAP.get(description.toLowerCase()));
    }

    /**
     * Sprawdza, czy podana nazwa statystyki jest prawidłową, dozwoloną nazwą.
     * @param description Nazwa statystyki do sprawdzenia.
     * @return true, jeśli nazwa jest prawidłowa.
     */
    public static boolean isValid(String description) {
        return fromDescription(description).isPresent();
    }
}
