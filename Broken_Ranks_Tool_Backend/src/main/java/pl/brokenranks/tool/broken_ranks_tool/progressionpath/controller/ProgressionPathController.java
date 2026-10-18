package pl.brokenranks.tool.broken_ranks_tool.progressionpath.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import pl.brokenranks.tool.broken_ranks_tool.core.execution.HeavyCalculationGate;
import pl.brokenranks.tool.broken_ranks_tool.core.web.error.*;
import pl.brokenranks.tool.broken_ranks_tool.progressionpath.dto.*;
import pl.brokenranks.tool.broken_ranks_tool.progressionpath.service.ProgressionTargetPlanningService;

/** A bounded statistical planner, separate from every optimizer mode. */
@RestController
@RequestMapping("/api/progression-path")
@RequiredArgsConstructor
public class ProgressionPathController {
    private final ProgressionTargetPlanningService service;
    private final HeavyCalculationGate gate;

    @PostMapping("/plan")
    public ProgressionPlanResponse plan(@Valid @RequestBody ProgressionTargetRequest request) {
        if (!gate.tryAcquire())
            throw new ApiException(
                    HttpStatus.TOO_MANY_REQUESTS,
                    ApiErrorCode.OPTIMIZER_BUSY,
                    "Trwają inne obliczenia. Spróbuj ponownie za chwilę.");
        try {
            gate.ensureMemoryAvailable();
            return service.plan(request);
        } finally {
            gate.release();
        }
    }
}
