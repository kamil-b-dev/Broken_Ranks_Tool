package pl.brokenranks.tool.broken_ranks_tool.core.utils;

import lombok.experimental.UtilityClass;

/**
 * Klasa narzędziowa zawierająca pomocnicze metody do operacji na stringach.
 * Adnotacja {@link UtilityClass} z Lomboka tworzy prywatny konstruktor,
 * aby zapobiec tworzeniu instancji tej klasy.
 */
@UtilityClass
public class StringUtils {

    /**
     * Konwertuje liczbę rzymską (w postaci stringa) na liczbę całkowitą.
     * Obsługuje liczby od I do XII.
     *
     * @param roman Liczba rzymska jako string.
     * @return Odpowiednik w postaci liczby całkowitej lub 0, jeśli format jest nieprawidłowy.
     */
    public static int convertRomanToInteger(String roman) {
        if (roman == null || roman.isEmpty()) {
            return 0;
        }
        return switch (roman.toUpperCase()) {
            case "I" -> 1;
            case "II" -> 2;
            case "III" -> 3;
            case "IV" -> 4;
            case "V" -> 5;
            case "VI" -> 6;
            case "VII" -> 7;
            case "VIII" -> 8;
            case "IX" -> 9;
            case "X" -> 10;
            case "XI" -> 11;
            case "XII" -> 12;
            default -> 0;
        };
    }
}
