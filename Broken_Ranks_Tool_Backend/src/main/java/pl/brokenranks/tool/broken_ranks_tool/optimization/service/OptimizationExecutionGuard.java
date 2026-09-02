package pl.brokenranks.tool.broken_ranks_tool.optimization.service;

import java.util.concurrent.Semaphore;
import org.springframework.stereotype.Service;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationResponse;

/** Protects the JVM from overlapping memory-intensive optimization runs. */
@Service
public class OptimizationExecutionGuard {

    private final ModsOptimizationService optimizationService;
    private final Semaphore permits = new Semaphore(1, true);

    public OptimizationExecutionGuard(ModsOptimizationService optimizationService) {
        this.optimizationService = optimizationService;
    }

    /** Runs one optimization or rejects the request when the worker is occupied. */
    public OptimizationResponse optimize(OptimizationRequest request) {
        if (!permits.tryAcquire()) {
            throw new OptimizerBusyException();
        }
        try {
            return optimizationService.optimize(request);
        } finally {
            permits.release();
        }
    }
}
