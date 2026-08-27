package pl.brokenranks.tool.broken_ranks_tool.equipment.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.CalculationResultDto;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.EquipmentStatsCalculatorService;

/** Exposes the HTTP endpoint for {@link EquipmentStatsCalculatorService}. */
@RestController
@RequestMapping("/api/calculator")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CalculatorController {

    private final EquipmentStatsCalculatorService calculatorService;

    /**
     * Calculates equipment statistics from the submitted configuration.
     * @param request Equipment and character data received from the client.
     * @return HTTP 200 with formatted statistics, or an error response for invalid input.
     */
    @PostMapping("/calculate")
    public ResponseEntity<CalculationResultDto> calculateStats(
            @RequestBody EquipmentRequest request) {
        CalculationResultDto result = calculatorService.calculateWithSources(request);
        return ResponseEntity.ok(result);
    }
}
