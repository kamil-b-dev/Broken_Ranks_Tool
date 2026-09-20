package pl.brokenranks.tool.broken_ranks_tool.optimization.service;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** Stable outcome values exposed by optimizer metrics. */
@Getter
@RequiredArgsConstructor
enum OptimizationRunOutcome {
    REJECTED("rejected"),
    SUCCESS("success"),
    NO_SOLUTION("no_solution"),
    ERROR("error");

    private final String metricValue;
}
