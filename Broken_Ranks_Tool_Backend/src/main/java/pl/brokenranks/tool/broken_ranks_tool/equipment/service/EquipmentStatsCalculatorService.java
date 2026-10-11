package pl.brokenranks.tool.broken_ranks_tool.equipment.service;

import java.util.Collection;
import java.util.Map;
import java.util.function.Function;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.CalculationResultDto;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.OrbTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.NumericStats;

/** Defines the statistics calculation contract independently from the API layer. */
public interface EquipmentStatsCalculatorService {
    /** Prepares numeric authoritative values without formatting every search candidate. */
    default Function<EquipmentRequest, NumericStats> prepareNumericCalculation(
            Map<Long, ItemTemplate> items,
            Map<Long, OrbTemplate> orbs,
            Map<Long, DrifTemplate> drifs) {
        var prepared = prepareCalculationWithSources(items, orbs, drifs);
        return request -> NumericStats.fromFormatted(prepared.apply(request).stats());
    }

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

    /** Prepares authoritative calculations and source metadata using a request-local catalog. */
    default Function<EquipmentRequest, CalculationResultDto> prepareCalculationWithSources(
            Map<Long, ItemTemplate> items,
            Map<Long, OrbTemplate> orbs,
            Map<Long, DrifTemplate> drifs) {
        return this::calculateWithSources;
    }

    /** Prepares repeated calculations on fixed equipment with an already loaded drif catalog. */
    default Function<EquipmentRequest, Map<String, String>> prepareCalculation(
            Map<Long, ItemTemplate> items,
            Map<Long, DrifTemplate> drifs,
            Collection<EquipmentRequest.SlotData> slots) {
        return this::calculateTotalStats;
    }
}
