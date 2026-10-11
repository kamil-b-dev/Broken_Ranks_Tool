package pl.brokenranks.tool.broken_ranks_tool.optimization.dto;

/** Separates invalid input and search failure from valid builds with soft unmet goals. */
public enum OptimizationOutcome {
    INVALID_INPUT,
    NO_BUILD_FOUND,
    VALID_BUILD_SOFT_TARGETS_UNMET,
    VALID_BUILD
}
