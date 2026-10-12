package pl.brokenranks.tool.broken_ranks_tool.optimization.service;

import static org.junit.jupiter.api.Assertions.*;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.lang.management.MemoryUsage;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.optimization.config.OptimizationMemoryProperties;

class OptimizationMemoryGuardTests {
    @Test
    void rejectsAtTheThresholdAndAutomaticallyAllowsWorkAfterMemoryIsFreed() {
        var usage = new AtomicReference<>(heap(84, 100));
        var registry = new SimpleMeterRegistry();
        var guard =
                new OptimizationMemoryGuard(
                        new OptimizationMemoryProperties(85), registry, usage::get);
        guard.ensureAvailable();
        assertEquals(16, registry.get("optimizer.memory.headroom.bytes").gauge().value());
        usage.set(heap(85, 100));
        assertThrows(OptimizerMemoryPressureException.class, guard::ensureAvailable);
        usage.set(heap(99, 100));
        assertThrows(OptimizerMemoryPressureException.class, guard::ensureAvailable);
        usage.set(heap(30, 100));
        guard.ensureAvailable();
        assertEquals(2, registry.counter("optimizer.memory.rejected").count());
        assertEquals(70, registry.get("optimizer.memory.headroom.bytes").gauge().value());
    }

    @Test
    void measuresAgainstTheMaximumHeapRatherThanCurrentlyCommittedMemory() {
        var registry = new SimpleMeterRegistry();
        var guard =
                new OptimizationMemoryGuard(
                        new OptimizationMemoryProperties(85),
                        registry,
                        () -> new MemoryUsage(0, 90, 100, 200));
        guard.ensureAvailable();
        assertEquals(110, registry.get("optimizer.memory.headroom.bytes").gauge().value());
    }

    @Test
    void handlesAnUnknownMaximumWithoutClaimingKnownHeadroom() {
        var registry = new SimpleMeterRegistry();
        var guard =
                new OptimizationMemoryGuard(
                        new OptimizationMemoryProperties(85),
                        registry,
                        () -> new MemoryUsage(0, 90, 100, -1));
        guard.ensureAvailable();
        assertTrue(Double.isNaN(registry.get("optimizer.memory.headroom.bytes").gauge().value()));
    }

    private MemoryUsage heap(long used, long max) {
        return new MemoryUsage(0, used, max, max);
    }
}
