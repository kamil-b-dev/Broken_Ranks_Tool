package pl.brokenranks.tool.broken_ranks_tool.app_data.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.DrifTemplateDto;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.OrbTemplate;

import java.util.List;

/**
 * Główne DTO agregujące wszystkie dane potrzebne do inicjalizacji
 * aplikacji na frontendzie. Wysyłane jako odpowiedź z endpointu /api/initial-data.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class InitialDataDto {
    /**
     * Lista wszystkich szablonów przedmiotów.
     */
    private List<ItemTemplate> items;

    /**
     * Lista wszystkich szablonów orbów.
     */
    private List<OrbTemplate> orbs;

    /**
     * Lista wszystkich szablonów drifów (jako DTO).
     */
    private List<DrifTemplateDto> drifs;

    /**
     * Obiekt zawierający wszystkie reguły gry.
     */
    private GameRulesDto gameRules;

    /**
     * Obiekt zawierający wszystkie słowniki i tłumaczenia.
     */
    private DictionariesDto dictionaries;
}
