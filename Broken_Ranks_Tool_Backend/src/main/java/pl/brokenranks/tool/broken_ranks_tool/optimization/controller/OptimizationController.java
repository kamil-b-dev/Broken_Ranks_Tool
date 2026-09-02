package pl.brokenranks.tool.broken_ranks_tool.optimization.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationResponse;
import pl.brokenranks.tool.broken_ranks_tool.optimization.service.OptimizationExecutionGuard;

@RestController
@RequestMapping("/api/optimizer")
@RequiredArgsConstructor
public class OptimizationController {

    private final OptimizationExecutionGuard executionGuard;

    /**
     * Starts drif optimization using the submitted priorities and constraints.
     * @param request Optimization priorities, targets, locks, and baseline equipment.
     * @return HTTP response containing the optimized setup and summary.
     */
    @PostMapping("/drifs")
    public ResponseEntity<OptimizationResponse> optimizeDrifs(
            @Valid @RequestBody OptimizationRequest request) {
        OptimizationResponse response = executionGuard.optimize(request);
        return ResponseEntity.ok(response);
    }
}
