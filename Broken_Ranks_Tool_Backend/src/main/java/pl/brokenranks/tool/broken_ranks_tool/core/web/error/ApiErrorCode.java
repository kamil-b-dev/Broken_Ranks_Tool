package pl.brokenranks.tool.broken_ranks_tool.core.web.error;

/** Stable machine-readable codes returned by failed API requests. */
public enum ApiErrorCode {
    INVALID_REQUEST,
    MALFORMED_JSON,
    NOT_FOUND,
    UNSUPPORTED_MEDIA_TYPE,
    METHOD_NOT_ALLOWED,
    INTERNAL_ERROR,
    OPTIMIZER_BUSY,
    RATE_LIMITED,
    REQUEST_TOO_LARGE,
    FORBIDDEN
}
