package pl.brokenranks.tool.broken_ranks_tool.optimization.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.CalculationResultDto;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;

/** Response DTO containing the optimization result. */
@Data
@NoArgsConstructor
public class OptimizationResponse {
    /** Complete optimized setup consumed by the frontend. */
    private EquipmentRequest optimizedSetup;

    /** Optimization summary and metadata. */
    private OptimizationSummary summary;

    /** Calculator result for the optimized setup, ready for direct frontend use. */
    private CalculationResultDto calculationResult;

    private AdvisorReport advisorReport;

    public OptimizationResponse(EquipmentRequest optimizedSetup, OptimizationSummary summary) {
        this.optimizedSetup = optimizedSetup;
        this.summary = summary;
    }

    public OptimizationResponse(
            EquipmentRequest optimizedSetup,
            OptimizationSummary summary,
            CalculationResultDto calculationResult) {
        this.optimizedSetup = optimizedSetup;
        this.summary = summary;
        this.calculationResult = calculationResult;
    }
}
