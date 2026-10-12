package pl.brokenranks.tool.broken_ranks_tool.optimization.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/** Reserves heap headroom before admitting another expensive search. */
@ConfigurationProperties("optimizer.memory")
public record OptimizationMemoryProperties(@DefaultValue("85") int maxHeapUsagePercent) {
    public OptimizationMemoryProperties {
        if (maxHeapUsagePercent < 1 || maxHeapUsagePercent > 95) {
            throw new IllegalArgumentException(
                    "Heap admission threshold must be between 1 and 95 percent.");
        }
    }
}
