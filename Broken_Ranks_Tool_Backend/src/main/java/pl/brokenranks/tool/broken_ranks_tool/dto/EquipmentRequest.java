package pl.brokenranks.tool.broken_ranks_tool.dto;

import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class EquipmentRequest {

    private Map<String, SlotData> slots;

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