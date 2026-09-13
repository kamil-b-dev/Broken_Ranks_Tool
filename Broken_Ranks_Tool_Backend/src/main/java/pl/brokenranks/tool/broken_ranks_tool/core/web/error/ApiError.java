package pl.brokenranks.tool.broken_ranks_tool.core.web.error;

/** Stable error contract returned by every failed API request. */
public record ApiError(String code, String message, String requestId) {}
