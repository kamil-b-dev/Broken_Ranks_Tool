package pl.brokenranks.tool.broken_ranks_tool.optimization.simpleprofile;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Data;

/** Small set of player-facing choices supported by profession profiles. */
@Data
public class SimpleProfileOptions {
    @Min(1)
    @Max(12)
    private Integer damageDrifs;

    @Min(1)
    @Max(12)
    private Integer accuracyDrifs;

    private SimpleBuildStyle style;
    private SimpleElement element;
    private Boolean passiveDamageReduction;
    private Boolean percentageDamageReduction;
    private Boolean damageReductionChance;
    private Boolean dodgeChance;
}
