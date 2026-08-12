package pl.brokenranks.tool.broken_ranks_tool.optimization.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;

import java.util.Map;
import java.util.Set;

/**
 * DTO dla żądania optymalizacji modyfikacji (drifów).
 * Zawiera dane o ekwipunku bazowym oraz zaawansowane parametry sterujące
 * takie jak wagi priorytetów, limity ilościowe, blokady oraz wymuszanie
 * maksymalnych wartości (Cap).
 */
@Data
public class OptimizationRequest {

    /**
     * Kompletna, oryginalna mapa slotów z frontendu.
     * Backend użyje jej jako bazy do przeprowadzenia optymalizacji.
     */
    private Map<String, EquipmentRequest.SlotData> originalSlots;

    /**
     * Mapa wag priorytetów dla poszczególnych typów bonusów.
     * Klucz: Typ bonusu zdefiniowany przez gracza.
     * Wartość: Punktowa waga (np. od 1 do 30), określająca jak mocno algorytm
     * powinien faworyzować ten modyfikator.
     */
    private Map<DRIF_BONUS_TYPE, Integer> priorities;

    /**
     * Oczekiwane widełki ilościowe dla konkretnych drifów (ograniczenia twarde).
     * Klucz: Typ bonusu.
     * Wartość: Obiekt zawierający minimalną i maksymalną pożądaną liczbę sztuk drifów tego typu.
     */
    private Map<DRIF_BONUS_TYPE, QuantityRange> targetQuantities;

    /** Docelowe wartości końcowe dla wybranych modyfikatorów. */
    private Map<DRIF_BONUS_TYPE, Double> targetValues;

    /**
     * Zestaw kluczy slotów (np. "helmet", "armor"), które mają zostać wykluczone z optymalizacji.
     * Algorytm skopiuje obecne drify w tych slotach w 100% i nie będzie ich modyfikował.
     */
    private Set<String> lockedSlots;

    /**
     * Mapa zablokowanych pojedynczych drifów w poszczególnych slotach.
     * Klucz: Identyfikator slotu (np. "weapon").
     * Wartość: Zestaw indeksów określających pozycję włożonego drifu,
     * którego algorytm ma nie usuwać ani nie zamieniać (np. [0, 2]).
     */
    private Map<String, Set<Integer>> lockedDrifs;

    /**
     * Zestaw typów bonusów, dla których algorytm ma bezwzględnie wymusić
     * osiągnięcie maksymalnego limitu (capa) zdefiniowanego w regułach gry.
     */
    private Set<DRIF_BONUS_TYPE> forceCapBonuses;

    /**
     * Modyfikatory oznaczone przez gracza jako krytyczne. Krytyczny mod musi
     * pozostać reprezentowany w wyniku, ale ta flaga sama w sobie nie wymusza
     * osiągnięcia capa ani konkretnej liczby drifów.
     */
    private Set<DRIF_BONUS_TYPE> criticalBonuses;

    /**
     * Klasa pomocnicza (DTO) reprezentująca przedział ilościowy (minimum i maksimum).
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuantityRange {

        /**
         * Minimalna oczekiwana liczba sztuk drifów danego typu.
         */
        private int min;

        /**
         * Maksymalna dopuszczalna liczba sztuk drifów danego typu.
         */
        private int max;
    }
}
