package pl.brokenranks.tool.broken_ranks_tool.equipment.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.EquipmentStatsCalculatorService;

import java.util.Map;

/**
 * Kontroler odpowiedzialny za obsługę żądań związanych z kalkulatorem statystyk.
 */
@RestController
@RequestMapping("/api/calculator")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CalculatorController {

    private final EquipmentStatsCalculatorService calculatorService;

    /**
     * Endpoint POST do obliczania statystyk ekwipunku.
     * Przyjmuje konfigurację ekwipunku i zwraca obliczone statystyki.
     *
     * @param request Ciało żądania zawierające dane o ekwipunku.
     * @return ResponseEntity z mapą obliczonych i sformatowanych statystyk.
     */
    @PostMapping("/calculate")
    public ResponseEntity<Map<String, String>> calculateStats(@RequestBody EquipmentRequest request) {
        Map<String, String> result = calculatorService.calculateTotalStats(request);
        return ResponseEntity.ok(result);
    }
}
