package pl.brokenranks.tool.broken_ranks_tool.app_data.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * DTO grupujące wszystkie słowniki (mapy tłumaczeń) potrzebne
 * do inicjalizacji aplikacji na frontendzie.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DictionariesDto {
    /**
     * Mapa tłumaczeń dla kategorii przedmiotów.
     * Klucz: nazwa enuma (np. "HELMET"), Wartość: polski opis (np. "Hełm").
     */
    private Map<String, String> itemCategories;

    /**
     * Mapa tłumaczeń dla kategorii orbów.
     * Klucz: nazwa enuma (np. "OFENSIVE"), Wartość: polski opis (np. "Ofensywne").
     */
    private Map<String, String> orbCategories;

    /**
     * Mapa tłumaczeń dla kategorii drifów.
     * Klucz: nazwa enuma (np. "OFENSIVE"), Wartość: polski opis (np. "Ofensywne").
     */
    private Map<String, String> drifCategories;
}
