package pl.brokenranks.tool.broken_ranks_tool.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pl.brokenranks.tool.broken_ranks_tool.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.service.EquipmentStatsCalculatorService;

import java.util.Map;

@RestController
@RequestMapping("/api/calculator")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CalculatorController {

    private final EquipmentStatsCalculatorService calculatorService;

    @PostMapping("/calculate")
    public ResponseEntity<Map<String, String>> calculateStats(@RequestBody EquipmentRequest request) {
        Map<String, String> result = calculatorService.calculateTotalStats(request);
        return ResponseEntity.ok(result);
    }
}