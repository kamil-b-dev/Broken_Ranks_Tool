package pl.brokenranks.tool.broken_ranks_tool.equipment.dto;

import lombok.Data;
import java.util.List;
import java.util.Map;

/** Request DTO sent to the equipment statistics calculator. */
@Data
public class EquipmentRequest {

    /** Equipment slot data keyed by slot name. */
    private Map<String, SlotData> slots;

    /** Character base statistics keyed by statistic name. */
    private Map<String, Integer> characterStats;

    /** Request data for one equipment slot. */
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
