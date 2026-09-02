package pl.brokenranks.tool.broken_ranks_tool.optimization.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Runtime limits controlling optimizer cost and concurrency. */
@ConfigurationProperties("optimizer")
public record OptimizationProperties(
        int beamSearchSteps,
        int maximizationSearchSteps,
        int refinementSearchSteps,
        int maxConcurrentRuns) {

    public OptimizationProperties {
        if (beamSearchSteps <= 0
                || maximizationSearchSteps <= 0
                || refinementSearchSteps <= 0
                || maxConcurrentRuns <= 0) {
            throw new IllegalArgumentException("Optimizer limits must be positive.");
        }
    }
}
