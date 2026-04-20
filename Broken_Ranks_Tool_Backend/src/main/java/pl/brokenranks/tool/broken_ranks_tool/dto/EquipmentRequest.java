package pl.brokenranks.tool.broken_ranks_tool.dto;

import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class EquipmentRequest {

    // Jeden potężny słownik trzymający wszystkie 12 slotów!
    // Kluczem jest nazwa slota z Reacta (np. "helmet", "armor")
    private Map<String, SlotData> slots;

    // Definicja pojedynczego slota (zagnieżdżona klasa)
    @Data
    public static class SlotData {
        private Long itemId;
        private Long orbId;
        private Integer orbLevel;
        private List<Long> drifIds;
        private Map<String, Integer> drifLevels;
    }
}