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
    public static final int SHORT_TIME_BUDGET_MS = 3000;
    public static final int LONG_TIME_BUDGET_MS = 6000;

    public enum Strategy {
        MINIMUM_CHANGE,
        BEST_RESULT
    }

    @NotNull private DRIF_BONUS_TYPE goal;

    @NotNull private Strategy strategy = Strategy.MINIMUM_CHANGE;

    private UUID runId;

    @Min(SHORT_TIME_BUDGET_MS)
    @Max(LONG_TIME_BUDGET_MS)
    private int timeBudgetMs = SHORT_TIME_BUDGET_MS;

    public static boolean isSupportedTimeBudget(int value) {
        return value == SHORT_TIME_BUDGET_MS || value == LONG_TIME_BUDGET_MS;
    }

    @Min(1)
    @Max(10)
    private int maxActions = 3;

    @DecimalMin("0.0")
    private Double targetValue;

    @DecimalMin("0.0")
    private Double targetGain;

    @NotNull private AdvisorProfession profession = AdvisorProfession.AUTO;

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
