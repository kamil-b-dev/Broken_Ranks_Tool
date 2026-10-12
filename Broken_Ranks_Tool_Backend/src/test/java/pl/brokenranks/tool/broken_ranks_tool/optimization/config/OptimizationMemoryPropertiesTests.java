package pl.brokenranks.tool.broken_ranks_tool.optimization.config;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.bind.Bindable;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.mock.env.MockEnvironment;

class OptimizationMemoryPropertiesTests {
    @Test
    void bindsADefaultThresholdAndAnExplicitOverride() {
        var environment = new MockEnvironment();
        assertEquals(
                85,
                Binder.get(environment)
                        .bindOrCreate(
                                "optimizer.memory", Bindable.of(OptimizationMemoryProperties.class))
                        .maxHeapUsagePercent());
        environment.setProperty("optimizer.memory.max-heap-usage-percent", "80");
        assertEquals(
                80,
                Binder.get(environment)
                        .bind("optimizer.memory", Bindable.of(OptimizationMemoryProperties.class))
                        .get()
                        .maxHeapUsagePercent());
        assertEquals(95, new OptimizationMemoryProperties(95).maxHeapUsagePercent());
    }

    @Test
    void rejectsDisabledOrUnsafeThresholds() {
        for (int threshold : new int[] {-1, 0, 96, 100}) {
            assertThrows(
                    IllegalArgumentException.class,
                    () -> new OptimizationMemoryProperties(threshold));
        }
    }
}
