package pl.brokenranks.tool.broken_ranks_tool.optimization.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;

/** Response DTO containing the optimization result. */
@Data
@NoArgsConstructor
public class OptimizationResponse {
    /** Complete optimized setup consumed by the frontend. */
    private EquipmentRequest optimizedSetup;

    /** Optimization summary and metadata. */
    private OptimizationSummary summary;

    private AdvisorReport advisorReport;

    public OptimizationResponse(EquipmentRequest optimizedSetup, OptimizationSummary summary) {
        this.optimizedSetup = optimizedSetup;
        this.summary = summary;
    }
}
