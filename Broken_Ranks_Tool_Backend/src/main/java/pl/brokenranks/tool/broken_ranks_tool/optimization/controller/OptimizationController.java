package pl.brokenranks.tool.broken_ranks_tool.optimization.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.service.ModsOptimizationService;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationResponse;

@RestController
@RequestMapping("/api/optimizer")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class OptimizationController {

    private final ModsOptimizationService optimizationService;

    /**
     * Uruchamia proces optymalizacji drifów na podstawie podanych priorytetów.
     * @param request DTO z żądaniem optymalizacji.
     * @return ResponseEntity z obiektem DTO zawierającym zoptymalizowaną konfigurację.
     */
    @PostMapping("/drifs")
    public ResponseEntity<OptimizationResponse> optimizeDrifs(@RequestBody OptimizationRequest request) {
        OptimizationResponse response = optimizationService.optimize(request);
        return ResponseEntity.ok(response);
    }
}
