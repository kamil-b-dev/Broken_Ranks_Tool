package pl.brokenranks.tool.broken_ranks_tool.optimization.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.Map;
import java.util.Set;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;

/** Request DTO for drif optimization, priorities, limits, locks, and caps. */
@Data
public class OptimizationRequest {

    /** Original equipment setup used as the optimization baseline. */
    @Valid
    @NotEmpty
    @Size(max = 12)
    private Map<String, EquipmentRequest.SlotData> originalSlots;

    /** Priority weights keyed by the bonus type selected by the user. */
    @NotEmpty
    @Size(max = 32)
    private Map<DRIF_BONUS_TYPE, @NotNull @Min(1) @Max(30) Integer> priorities;

    /** Hard minimum and maximum quantity ranges for selected drif bonuses. */
    @Valid
    @Size(max = 32)
    private Map<DRIF_BONUS_TYPE, QuantityRange> targetQuantities;

    /** Slot keys excluded from optimization and copied unchanged. */
    @Size(max = 12)
    private Set<String> lockedSlots;

    /** Locked drif indexes keyed by equipment slot. */
    @Size(max = 12)
    private Map<String, @Size(max = 8) Set<Integer>> lockedDrifs;

    /** Bonus types for which the optimizer must reach the game-rule cap. */
    @Size(max = 32)
    private Set<DRIF_BONUS_TYPE> forceCapBonuses;

    /** User-defined percentage targets keyed by the selected bonus type. */
    @Size(max = 32)
    private Map<DRIF_BONUS_TYPE, @NotNull @Min(0) Double> forcedPercentageTargets;

    /** Bonus types whose value should be maximized within the remaining constraints. */
    @Size(max = 32)
    private Set<DRIF_BONUS_TYPE> maximizeBonuses;

    /** Pre-locks maximum-level maximized drifs on items with the highest drif bonus. */
    private boolean forceMaximizationByDrifBonus;

    /** Enables the additional post-optimization search for interactive alternatives. */
    private boolean generateVariants;

    /** Maximum percentage loss allowed on another priority when selecting a variant. */
    @Min(0)
    @Max(100)
    private Integer maxVariantLossPercent;

    /** DTO representing a minimum and maximum quantity range. */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuantityRange {

        /** Minimum expected quantity for the bonus type. */
        @Min(0)
        @Max(12)
        private int min;

        /** Maximum allowed quantity for the bonus type. */
        @Min(0)
        @Max(12)
        private int max;
    }
}
