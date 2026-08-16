package pl.brokenranks.tool.broken_ranks_tool.equipment.service;

import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.CalculationResultDto;
import java.util.Map;

/** Defines the statistics calculation contract independently from the API layer. */
public interface EquipmentStatsCalculatorService {

    /**
     * Processes an equipment request and returns formatted final statistics.
     * @param request Equipment and character configuration to calculate.
     * @return Formatted statistics keyed by business statistic name.
     * @throws IllegalArgumentException If the request violates equipment rules.
     */
    Map<String, String> calculateTotalStats(EquipmentRequest request);

    /**
     * Processes an equipment request and returns statistics with the exact bonus sources used.
     * @param request Equipment and character configuration to calculate.
     * @return Statistics together with the drif and orb metadata required by the UI.
     * @throws IllegalArgumentException If the request violates equipment rules.
     */
    CalculationResultDto calculateWithSources(EquipmentRequest request);

}
