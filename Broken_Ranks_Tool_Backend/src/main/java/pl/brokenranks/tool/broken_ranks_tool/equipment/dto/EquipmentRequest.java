package pl.brokenranks.tool.broken_ranks_tool.equipment.dto;

import lombok.Data;
import java.util.List;
import java.util.Map;

/**
 * Data Transfer Object (DTO) reprezentujący żądanie obliczenia statystyk.
 * Obiekt ten jest przesyłany w ciele żądania POST do endpointu /api/calculator/calculate.
 */
@Data
public class EquipmentRequest {

    /**
     * Mapa przechowująca dane o poszczególnych slotach ekwipunku.
     * Kluczem jest nazwa slotu (np. "helmet", "weapon").
     */
    private Map<String, SlotData> slots;

    /**
     * Mapa przechowująca bazowe statystyki postaci (np. Siła, Zręczność).
     */
    private Map<String, Integer> characterStats;

    /**
     * Wewnętrzna klasa reprezentująca dane dla pojedynczego slotu ekwipunku.
     */
    @Data
    public static class SlotData {
        private Long itemId;
        private Integer itemStars;
        private Long orbId;
        private Integer orbLevel;
        private List<Long> drifIds;
        private Map<String, Integer> drifLevels;
    }
}
