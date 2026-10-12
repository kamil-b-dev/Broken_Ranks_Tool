package pl.brokenranks.tool.broken_ranks_tool.optimization.service;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import java.lang.management.ManagementFactory;
import java.lang.management.MemoryUsage;
import java.util.function.Supplier;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import pl.brokenranks.tool.broken_ranks_tool.optimization.config.OptimizationMemoryProperties;

/** Admission control only: never forces GC or interrupts a search already returning a build. */
@Component
public final class OptimizationMemoryGuard {
    private final OptimizationMemoryProperties properties;
    private final Supplier<MemoryUsage> heap;
    private final Counter rejected;

    @Autowired
    public OptimizationMemoryGuard(
            OptimizationMemoryProperties properties, MeterRegistry registry) {
        this(properties, registry, ManagementFactory.getMemoryMXBean()::getHeapMemoryUsage);
    }

    OptimizationMemoryGuard(
            OptimizationMemoryProperties properties,
            MeterRegistry registry,
            Supplier<MemoryUsage> heap) {
        this.properties = properties;
        this.heap = heap;
        this.rejected = registry.counter("optimizer.memory.rejected");
        Gauge.builder(
                        "optimizer.memory.headroom.bytes",
                        this,
                        guard -> guard.headroom(guard.heap.get()))
                .register(registry);
    }

    public void ensureAvailable() {
        MemoryUsage usage = heap.get();
        if (usage.getMax() > 0
                && (double) usage.getUsed() / usage.getMax() * 100
                        >= properties.maxHeapUsagePercent()) {
            rejected.increment();
            throw new OptimizerMemoryPressureException();
        }
    }

    private double headroom(MemoryUsage usage) {
        return usage.getMax() < 0 ? Double.NaN : Math.max(0, usage.getMax() - usage.getUsed());
    }
}
