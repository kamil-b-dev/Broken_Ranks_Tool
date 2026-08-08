package pl.brokenranks.tool.broken_ranks_tool.app_data.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.core.enums.ORB_CATEGORY;

import java.util.List;
import java.util.Map;

/**
 * DTO grupujące wszystkie reguły gry potrzebne do działania logiki
 * frontendowej (np. wbudowane drify, zasady slotowania orbów).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class GameRulesDto {
    /**
     * Mapa wbudowanych drifów dla przedmiotów epickich i setowych.
     * Klucz: nazwa przedmiotu, Wartość: lista typów bonusów drifów.
     */
    private Map<String, List<String>> epicBuiltInDrifs;

    /**
     * Mapa reguł slotowania orbów.
     * Klucz: klucz slotu (np. "weapon"), Wartość: lista dozwolonych kategorii orbów.
     */
    private Map<String, List<ORB_CATEGORY>> slotOrbRules;

    /**
     * Mapa tłumaczeń dla wszystkich typów bonusów (drifów i orbów).
     * Klucz: nazwa enuma (np. "CRITICAL_CHANCE"), Wartość: polski opis (np. "Szansa na krytyk").
     */
    private Map<String, String> bonusTranslations;

    /**
     * Mapa mocy bazowych dla każdego typu bonusu drifu.
     * Klucz: nazwa enuma (np. "CRITICAL_CHANCE"), Wartość: moc bazowa.
     */
    private Map<String, Integer> drifBasePowers;

    /**
     * Mapa maksymalnych limitów (capów) dla każdego typu bonusu drifu.
     * Klucz: nazwa enuma, Wartość: maksymalny limit (lub null w przypadku braku limitu).
     */
    private Map<String, Integer> drifMaxCaps;
}