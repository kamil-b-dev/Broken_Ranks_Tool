package pl.brokenranks.tool.broken_ranks_tool.optimization.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;

/** Jeden wariant konfiguracji wygenerowany przez algorytm optymalizacji. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OptimizationVariant {
    private String name;
    private String description;
    private double score;
    private EquipmentRequest setup;
    private OptimizationSummary summary;
}
