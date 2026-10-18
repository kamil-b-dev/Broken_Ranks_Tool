package pl.brokenranks.tool.broken_ranks_tool.optimization.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
import java.util.Map;
import lombok.Data;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;

/** Operational tasks over owned stones, with explicit upgrade, insertion and reservation targets. */
@Data
public class ReorganizationOptions {
    public enum Task {
        ARRANGE,
        UPGRADE,
        INSERT,
        RESERVE
    }

    @NotNull private Task task = Task.ARRANGE;
    private DRIF_BONUS_TYPE goal;
    private boolean allowUnequip;
    @Valid private Upgrade upgrade;

    @Valid
    @Size(max = 36)
    private List<@NotNull Upgrade> upgrades;

    @Size(max = 128)
    private String insertEntryId;

    @Valid private Reservation reservation;

    @NotNull
    @Min(1)
    @Max(50)
    private Integer maxMoves = 50;

    /** Legacy API ranking preference; the current UI always prefers fewer moves within its limit. */
    private boolean preferFewestMoves = true;

    public List<Upgrade> requestedUpgrades() {
        return upgrades != null ? upgrades : upgrade == null ? List.of() : List.of(upgrade);
    }

    @Data
    public static class Reservation {
        @NotBlank private String slotKey;

        @Min(0)
        @Max(3)
        private int freeSockets;

        @Min(0)
        @Max(1000)
        private int freeCapacity;
    }

    @Valid
    @Size(max = 32)
    private Map<DRIF_BONUS_TYPE, Protection> protectedModifiers;

    @Data
    public static class Upgrade {
        @NotBlank private String sourceSlotKey;

        @Min(0)
        @Max(7)
        private int sourceDrifIndex;

        @NotNull @Positive private Long targetTemplateId;

        @Min(1)
        @Max(21)
        private int targetLevel;

        private boolean maximizeLevel;
    }

    @Data
    public static class Protection {
        private boolean enabled = true;

        @DecimalMin("0.0")
        private double loss;
    }
}
