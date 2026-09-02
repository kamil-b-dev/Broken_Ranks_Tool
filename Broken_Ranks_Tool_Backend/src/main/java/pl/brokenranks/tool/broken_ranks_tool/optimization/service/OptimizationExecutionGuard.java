package pl.brokenranks.tool.broken_ranks_tool.optimization.service;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import java.util.concurrent.Semaphore;
import java.util.concurrent.atomic.AtomicInteger;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import pl.brokenranks.tool.broken_ranks_tool.optimization.config.OptimizationProperties;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationResponse;

/** Protects the JVM from overlapping memory-intensive optimization runs. */
@Service
@Slf4j
public class OptimizationExecutionGuard {

    private final ModsOptimizationService optimizationService;
    private final Semaphore permits;
    private final AtomicInteger activeRuns = new AtomicInteger();
    private final Counter rejectedRuns;
    private final Counter successfulRuns;
    private final Counter unsuccessfulRuns;
    private final Counter failedRuns;
    private final Timer duration;

    public OptimizationExecutionGuard(
            ModsOptimizationService optimizationService,
            OptimizationProperties properties,
            MeterRegistry meterRegistry) {
        this.optimizationService = optimizationService;
        this.permits = new Semaphore(properties.maxConcurrentRuns(), true);
        Gauge.builder("optimizer.active", activeRuns, AtomicInteger::get).register(meterRegistry);
        this.rejectedRuns = meterRegistry.counter("optimizer.runs", "outcome", "rejected");
        this.successfulRuns = meterRegistry.counter("optimizer.runs", "outcome", "success");
        this.unsuccessfulRuns = meterRegistry.counter("optimizer.runs", "outcome", "no_solution");
        this.failedRuns = meterRegistry.counter("optimizer.runs", "outcome", "error");
        this.duration = meterRegistry.timer("optimizer.duration");
    }

    /** Runs one optimization or rejects the request when the worker is occupied. */
    public OptimizationResponse optimize(OptimizationRequest request) {
        if (!permits.tryAcquire()) {
            rejectedRuns.increment();
            throw new OptimizerBusyException();
        }
        Timer.Sample sample = Timer.start();
        activeRuns.incrementAndGet();
        try {
            OptimizationResponse response = optimizationService.optimize(request);
            boolean successful = response.getSummary() != null && response.getSummary().isSuccess();
            (successful ? successfulRuns : unsuccessfulRuns).increment();
            log.info(
                    "Optimization finished: success={}, slots={}, priorities={}",
                    successful,
                    request.getOriginalSlots() != null ? request.getOriginalSlots().size() : 0,
                    request.getPriorities() != null ? request.getPriorities().size() : 0);
            return response;
        } catch (RuntimeException ex) {
            failedRuns.increment();
            throw ex;
        } finally {
            sample.stop(duration);
            activeRuns.decrementAndGet();
            permits.release();
        }
    }
}
