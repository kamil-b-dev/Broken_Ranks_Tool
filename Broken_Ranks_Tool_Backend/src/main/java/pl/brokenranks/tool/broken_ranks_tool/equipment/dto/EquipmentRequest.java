package pl.brokenranks.tool.broken_ranks_tool.equipment.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;
import lombok.Data;

/** Request DTO sent to the equipment statistics calculator. */
@Data
public class EquipmentRequest {

    /** Equipment slot data keyed by slot name. */
    @Valid
    @Size(max = 12)
    private Map<String, SlotData> slots;

    /** Character base statistics keyed by statistic name. */
    @Size(max = 32)
    private Map<String, Integer> characterStats;

    /** Request data for one equipment slot. */
    @Data
    public static class SlotData {
        private Long itemId;

        @Min(0)
        @Max(9)
        private Integer itemStars;

        @Size(max = 2)
        private List<Long> orbIds;

        @Size(max = 2)
        private List<Integer> orbLevels;

        @Size(max = 8)
        private List<Long> drifIds;

        @Size(max = 8)
        private Map<String, Integer> drifLevels;
    }
}
