package pl.brokenranks.tool.broken_ranks_tool.optimization.dto;

/** Why bounded search stopped; completion alone never establishes global optimality. */
public enum SearchStopReason {
    COMPLETED,
    OPERATION_LIMIT,
    TIME_LIMIT,
    STATE_LIMIT,
    CANCELLED,
    INTERRUPTED,
    NOT_STARTED
}
