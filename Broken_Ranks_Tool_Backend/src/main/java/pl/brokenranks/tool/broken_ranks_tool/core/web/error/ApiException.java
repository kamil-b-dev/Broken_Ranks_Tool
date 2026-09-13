package pl.brokenranks.tool.broken_ranks_tool.core.web.error;

import org.springframework.http.HttpStatus;

/** Base exception for expected API failures owned by feature modules. */
public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    public ApiException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getCode() {
        return code;
    }
}
