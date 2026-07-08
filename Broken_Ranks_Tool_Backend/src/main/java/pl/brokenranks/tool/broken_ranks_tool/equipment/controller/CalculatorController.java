package pl.brokenranks.tool.broken_ranks_tool.equipment.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.EquipmentStatsCalculatorService;

import java.util.Map;

/**
 * Udostępnia endpoint HTTP dla serwisu {@link EquipmentStatsCalculatorService}.
 */
@RestController
@RequestMapping("/api/calculator")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CalculatorController {

    private final EquipmentStatsCalculatorService calculatorService;

    /**
     * Endpoint API do obliczania statystyk ekwipunku.
     *
     * @param request Ciało żądania zawierające konfigurację ekwipunku.
     * @return ResponseEntity z mapą obliczonych i sformatowanych statystyk.
     */
    @PostMapping("/calculate")
    public ResponseEntity<Map<String, String>> calculateStats(@RequestBody EquipmentRequest request) {
        Map<String, String> result = calculatorService.calculateTotalStats(request);
        return ResponseEntity.ok(result);
    }
}
