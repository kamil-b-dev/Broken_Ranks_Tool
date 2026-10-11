package pl.brokenranks.tool.broken_ranks_tool.optimization.dto;

import java.util.List;
import java.util.Map;
import lombok.Data;
import lombok.NoArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.CalculationResultDto;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;

/** Contains optimization metadata and result summary. */
@Data
@NoArgsConstructor
public class OptimizationSummary {
    private boolean success;
    private String message;
    private int drifsPlaced;
    private int totalPowerUsed;
    private double executionTimeSeconds;

    /** Non-fatal optimization warnings, including every forced cap that was not reached. */
    private List<String> warnings;

    /** Items grouped by the drif bonus map used by the optimizer. */
    private Map<Double, List<ItemDrifBonus>> itemsByDrifBonus;

    /** Calculator-verified outcome for every priority selected by the user. */
    private List<GoalResult> goalResults;

    /** Calculator-verified alternatives that improve at least one maximized modifier. */
    private List<OptimizationVariant> nextVariants;

    private OptimizationOutcome outcome;
    private OptimizationSearchReport searchReport;

    /** Retains the existing Java construction contract while extending response metadata. */
    public OptimizationSummary(
            boolean success,
            String message,
            int drifsPlaced,
            int totalPowerUsed,
            double executionTimeSeconds,
            List<String> warnings,
            Map<Double, List<ItemDrifBonus>> itemsByDrifBonus,
            List<GoalResult> goalResults,
            List<OptimizationVariant> nextVariants) {
        this.success = success;
        this.message = message;
        this.drifsPlaced = drifsPlaced;
        this.totalPowerUsed = totalPowerUsed;
        this.executionTimeSeconds = executionTimeSeconds;
        this.warnings = warnings;
        this.itemsByDrifBonus = itemsByDrifBonus;
        this.goalResults = goalResults;
        this.nextVariants = nextVariants;
    }

    /** Identifies an item within an optimizer slot. */
    public record ItemDrifBonus(String slotKey, String itemName) {}

    /** Compares a requested optimization goal with the final calculator value. */
    public record GoalResult(
            String statKey,
            String bonusName,
            int priority,
            int placedCount,
            int minimumCount,
            int maximumCount,
            String calculatorValue,
            String targetLabel,
            boolean quantitySatisfied,
            Boolean targetSatisfied) {}

    /** Describes a trade-off available relative to the selected final setup. */
    public record OptimizationVariant(
            boolean main,
            String bonusName,
            double finalValue,
            double variantValue,
            double gain,
            double totalLoss,
            int changeCount,
            double score,
            List<PlacementChange> changes,
            List<StatChange> statChanges,
            EquipmentRequest setup,
            CalculationResultDto calculationResult) {}

    /** Calculator value changed by selecting an alternative variant. */
    public record StatChange(String statKey, String finalValue, String variantValue) {}

    /** Describes one drif replacement required by an alternative setup. */
    public record PlacementChange(
            String slotKey,
            String itemName,
            String fromModifier,
            Integer fromLevel,
            String toModifier,
            Integer toLevel) {}
}
