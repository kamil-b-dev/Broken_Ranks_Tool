package pl.brokenranks.tool.broken_ranks_tool.optimization.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;

import java.util.Map;
import java.util.Set;

/** Request DTO for drif optimization, priorities, limits, locks, and caps. */
@Data
public class OptimizationRequest {

    /** Original equipment setup used as the optimization baseline. */
    private Map<String, EquipmentRequest.SlotData> originalSlots;

    /** Priority weights keyed by the bonus type selected by the user. */
    private Map<DRIF_BONUS_TYPE, Integer> priorities;

    /** Hard minimum and maximum quantity ranges for selected drif bonuses. */
    private Map<DRIF_BONUS_TYPE, QuantityRange> targetQuantities;

    /** Slot keys excluded from optimization and copied unchanged. */
    private Set<String> lockedSlots;

    /** Locked drif indexes keyed by equipment slot. */
    private Map<String, Set<Integer>> lockedDrifs;

    /** Bonus types for which the optimizer must reach the game-rule cap. */
    private Set<DRIF_BONUS_TYPE> forceCapBonuses;

    /** Bonus types whose value should be maximized within the remaining constraints. */
    private Set<DRIF_BONUS_TYPE> maximizeBonuses;

    /** Pre-locks maximum-level maximized drifs on items with the highest drif bonus. */
    private boolean forceMaximizationByDrifBonus;

    /** Enables the additional post-optimization search for interactive alternatives. */
    private boolean generateVariants;

    /** Maximum percentage loss allowed on another priority when selecting a variant. */
    private Integer maxVariantLossPercent;

    /** DTO representing a minimum and maximum quantity range. */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuantityRange {

        /** Minimum expected quantity for the bonus type. */
        private int min;

        /** Maximum allowed quantity for the bonus type. */
        private int max;
    }
}
