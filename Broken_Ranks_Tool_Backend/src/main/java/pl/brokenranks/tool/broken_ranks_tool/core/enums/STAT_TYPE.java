package pl.brokenranks.tool.broken_ranks_tool.core.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Reprezentuje wszystkie dozwolone typy statystyk bazowych i głównych.
 */
@Getter
@RequiredArgsConstructor
public enum STAT_TYPE {
    SILA("Siła"),
    ZRECZNOSC("Zręczność"),
    MOC("Moc"),
    WIEDZA("Wiedza"),
    PZ("PŻ"),
    MANA("Mana"),
    KONDYCJA("Kondycja"),
    OBRAZENIA("Obrażenia");

    private final String displayName;

    private static final Set<String> ALL_DISPLAY_NAMES = Arrays.stream(values())
            .map(STAT_TYPE::getDisplayName)
            .collect(Collectors.toSet());

    /**
     * Sprawdza, czy podana nazwa statystyki jest prawidłową, dozwoloną nazwą.
     * @param name Nazwa statystyki do sprawdzenia.
     * @return true, jeśli nazwa jest prawidłowa.
     */
    public static boolean isValid(String name) {
        return ALL_DISPLAY_NAMES.contains(name);
    }
}
