package pl.brokenranks.tool.broken_ranks_tool.equipment.dto;

import lombok.Data;
import java.util.List;
import java.util.Map;

/**
 * Data Transfer Object (DTO) dla żądania obliczenia statystyk.
 * Reprezentuje strukturę danych przesyłaną do API kalkulatora.
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
        private List<Long> orbIds;
        private List<Integer> orbLevels;
        private List<Long> drifIds;
        private Map<String, Integer> drifLevels;
    }
}
