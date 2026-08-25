package pl.brokenranks.tool.broken_ranks_tool.optimization.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;


/** Response DTO containing the optimization result. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OptimizationResponse {
    /** Complete optimized setup consumed by the frontend. */
    private EquipmentRequest optimizedSetup;

    /** Optimization summary and metadata. */
    private OptimizationSummary summary;
}
