package pl.brokenranks.tool.broken_ranks_tool.optimization.dto;

/** Describes the strength and termination state of an advisor result. */
public enum AdvisorStatus {
    OPTIMAL,
    BEST_FOUND,
    INFEASIBLE,
    CANCELLED
}
