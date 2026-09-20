package pl.brokenranks.tool.broken_ranks_tool.core.ratelimit;

/** Identifies independent request-rate budgets. */
public enum RateLimitPolicy {
    PUBLIC_DATA,
    OPTIMIZER,
    CALCULATOR,
    CONTROL
}
