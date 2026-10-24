package pl.brokenranks.tool.broken_ranks_tool.core.execution;

import java.lang.management.ManagementFactory;
import java.lang.management.MemoryUsage;
import java.util.concurrent.Semaphore;
import java.util.function.Supplier;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import pl.brokenranks.tool.broken_ranks_tool.core.web.error.*;

/** Shared admission for optimizer and progression planning, with no unbounded waiting queue. */
@Component
public class HeavyCalculationGate {
    private final Semaphore permits;
    private final int maxHeapUsagePercent;
    private final Supplier<MemoryUsage> heapUsage;

    @Autowired
    public HeavyCalculationGate(
            @Value("${optimizer.max-concurrent-runs:1}") int count,
            @Value("${optimizer.memory.max-heap-usage-percent:85}") int maxHeapUsagePercent) {
        this(
                count,
                maxHeapUsagePercent,
                () -> ManagementFactory.getMemoryMXBean().getHeapMemoryUsage());
    }

    HeavyCalculationGate(int count, int maxHeapUsagePercent, Supplier<MemoryUsage> heapUsage) {
        if (count < 1 || maxHeapUsagePercent < 1 || maxHeapUsagePercent > 95)
            throw new IllegalArgumentException("Nieprawidłowy limit obliczeń.");
        this.permits = new Semaphore(count, true);
        this.maxHeapUsagePercent = maxHeapUsagePercent;
        this.heapUsage = heapUsage;
    }

    public boolean tryAcquire() {
        return permits.tryAcquire();
    }

    public void release() {
        permits.release();
    }

    public void ensureMemoryAvailable() {
        var heap = heapUsage.get();
        if (heap.getMax() > 0
                && (double) heap.getUsed() / heap.getMax() * 100 >= maxHeapUsagePercent) {
            throw new ApiException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    ApiErrorCode.OPTIMIZER_MEMORY_PRESSURE,
                    "Brak zasobów pamięci do rozpoczęcia obliczeń. Spróbuj ponownie później.");
        }
    }
}
