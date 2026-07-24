package pl.brokenranks.tool.broken_ranks_tool.optimization.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO zawierające metadane i podsumowanie wyników procesu optymalizacji.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OptimizationSummary {
    private boolean success;
    private String message;
    private int drifsPlaced;
    private int totalPowerUsed;
    private double executionTimeSeconds;
}
