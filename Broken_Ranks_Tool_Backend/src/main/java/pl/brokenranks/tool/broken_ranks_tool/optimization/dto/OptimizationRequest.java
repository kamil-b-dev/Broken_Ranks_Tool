package pl.brokenranks.tool.broken_ranks_tool.optimization.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
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
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_SIZE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.simpleprofile.SimpleAspectImportance;
import pl.brokenranks.tool.broken_ranks_tool.optimization.simpleprofile.SimpleBuildAspect;
import pl.brokenranks.tool.broken_ranks_tool.optimization.simpleprofile.SimpleBuildProfile;
import pl.brokenranks.tool.broken_ranks_tool.optimization.simpleprofile.SimpleProfileOptions;

/** Request DTO for drif optimization, priorities, limits, locks, and caps. */
@Data
public class OptimizationRequest {

    /** Optimization workflow selected by the user. */
    @NotNull private OptimizationMode mode = OptimizationMode.BUILD_FROM_SCRATCH;

    /** UI complexity selected for build-from-scratch. Defaults to legacy advanced semantics. */
    @NotNull private BuildConfigurationMode configurationMode = BuildConfigurationMode.ADVANCED;

    /** Combat style used by the profile-driven simple mode. */
    private SimpleBuildProfile simpleProfile;

    /** Profession-specific controls exposed by the simple optimizer. */
    @Valid private SimpleProfileOptions simpleOptions;

    /** Player-selected building blocks and their coarse importance. */
    @Size(max = 6)
    private Map<SimpleBuildAspect, @NotNull SimpleAspectImportance> simpleAspects;

    /** Internal soft quantity preferences reported without invalidating a simple-mode result. */
    @JsonIgnore private Map<DRIF_BONUS_TYPE, Integer> simplePreferredQuantities;

    @Valid private AdvisorOptions advisor;

    @Size(max = 32)
    private Map<String, @Min(0) @Max(50_000) Integer> characterStats;

    /** Original equipment setup used as the optimization baseline. */
    @Valid
    @NotEmpty
    @Size(max = 12)
    private Map<String, EquipmentRequest.SlotData> originalSlots;

    /** Priority weights keyed by the bonus type selected by the user. */
    @Size(max = 32)
    private Map<DRIF_BONUS_TYPE, @NotNull @Min(1) @Max(30) Integer> priorities;

    /** Hard minimum and maximum quantity ranges for selected drif bonuses. */
    @Valid
    @Size(max = 32)
    private Map<DRIF_BONUS_TYPE, QuantityRange> targetQuantities;

    /** Optional hard quantity ranges for each bonus and drif size in advanced mode. */
    @Valid
    @Size(max = 32)
    private Map<DRIF_BONUS_TYPE, @Size(max = 4) Map<DRIF_SIZE, @Valid QuantityRange>>
            drifSizeQuantities;

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
