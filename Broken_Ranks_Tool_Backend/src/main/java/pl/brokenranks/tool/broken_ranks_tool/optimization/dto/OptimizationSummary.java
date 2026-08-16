package pl.brokenranks.tool.broken_ranks_tool.optimization.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/** Contains optimization metadata and result summary. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OptimizationSummary {
    private boolean success;
    private String message;
    private int drifsPlaced;
    private int totalPowerUsed;
    private double executionTimeSeconds;

    /** Non-fatal optimization warnings, including every forced cap that was not reached. */
    private List<String> warnings;
}
