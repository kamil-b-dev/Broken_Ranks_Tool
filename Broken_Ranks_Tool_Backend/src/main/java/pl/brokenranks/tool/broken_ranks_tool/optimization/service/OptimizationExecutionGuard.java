package pl.brokenranks.tool.broken_ranks_tool.optimization.service;

import java.util.concurrent.Semaphore;
import org.springframework.stereotype.Service;
import pl.brokenranks.tool.broken_ranks_tool.optimization.config.OptimizationProperties;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationResponse;

/** Protects the JVM from overlapping memory-intensive optimization runs. */
@Service
public class OptimizationExecutionGuard {

    private final ModsOptimizationService optimizationService;
    private final Semaphore permits;

    public OptimizationExecutionGuard(
            ModsOptimizationService optimizationService, OptimizationProperties properties) {
        this.optimizationService = optimizationService;
        this.permits = new Semaphore(properties.maxConcurrentRuns(), true);
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
