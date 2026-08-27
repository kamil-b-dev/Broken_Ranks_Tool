package pl.brokenranks.tool.broken_ranks_tool.optimization.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationResponse;
import pl.brokenranks.tool.broken_ranks_tool.optimization.service.ModsOptimizationService;

@RestController
@RequestMapping("/api/optimizer")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class OptimizationController {

    private final ModsOptimizationService optimizationService;

    /**
     * Starts drif optimization using the submitted priorities and constraints.
     * @param request Optimization priorities, targets, locks, and baseline equipment.
     * @return HTTP response containing the optimized setup and summary.
     */
    @PostMapping("/drifs")
    public ResponseEntity<OptimizationResponse> optimizeDrifs(
            @RequestBody OptimizationRequest request) {
        OptimizationResponse response = optimizationService.optimize(request);
        return ResponseEntity.ok(response);
    }
}
