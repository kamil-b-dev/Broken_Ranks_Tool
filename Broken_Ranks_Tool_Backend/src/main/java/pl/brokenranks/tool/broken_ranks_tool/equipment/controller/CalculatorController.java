package pl.brokenranks.tool.broken_ranks_tool.equipment.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.CalculationExplanationDto;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.CalculationResultDto;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.EquipmentStatsCalculatorService;

/** Exposes the HTTP endpoint for {@link EquipmentStatsCalculatorService}. */
@RestController
@RequestMapping("/api/calculator")
@RequiredArgsConstructor
public class CalculatorController {

    private final EquipmentStatsCalculatorService calculatorService;

    @PostMapping(value = "/calculate", params = "explain=true")
    public ResponseEntity<CalculationExplanationDto> explainStats(
            @Valid @RequestBody EquipmentRequest request) {
        return ResponseEntity.ok(calculatorService.calculateExplanation(request));
    }

    /**
     * Calculates equipment statistics from the submitted configuration.
     * @param request Equipment and character data received from the client.
     * @return HTTP 200 with formatted statistics, or an error response for invalid input.
     */
    @PostMapping("/calculate")
    public ResponseEntity<CalculationResultDto> calculateStats(
            @Valid @RequestBody EquipmentRequest request) {
        CalculationResultDto result = calculatorService.calculateWithSources(request);
        return ResponseEntity.ok(result);
    }
}
