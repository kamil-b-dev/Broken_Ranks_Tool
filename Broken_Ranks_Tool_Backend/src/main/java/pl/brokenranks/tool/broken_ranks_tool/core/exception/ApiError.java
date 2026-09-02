package pl.brokenranks.tool.broken_ranks_tool.core.exception;

/** Stable error contract returned by every failed API request. */
public record ApiError(String code, String message) {}
