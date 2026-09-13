package pl.brokenranks.tool.broken_ranks_tool.optimization.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.Map;
import java.util.UUID;
import lombok.Data;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;

/** Relative goals and explicitly permitted actions for an inventory-preserving search. */
@Data
public class AdvisorOptions {
    @NotNull private DRIF_BONUS_TYPE goal;

    private UUID runId;

    @Min(200)
    @Max(5000)
    private int timeBudgetMs = 1500;

    @Min(1)
    @Max(3)
    private int maxActions = 3;

    @DecimalMin("0.0")
    private Double targetValue;

    @DecimalMin("0.0")
    private Double targetGain;

    @Pattern(regexp = "AUTO|MAGICAL|PHYSICAL|UNIVERSAL")
    private String profession = "AUTO";

    @Valid private Changes allowedChanges = new Changes();

    @Valid
    @Size(max = 32)
    private Map<DRIF_BONUS_TYPE, Protection> protectedModifiers;

    @Data
    public static class Changes {
        private boolean stars = true;
        private boolean items;
        private boolean drifs;
        private boolean drifUpgrades;
    }

    @Data
    public static class Protection {
        private boolean enabled = true;

        @DecimalMin("0.0")
        private double loss;
    }
}
