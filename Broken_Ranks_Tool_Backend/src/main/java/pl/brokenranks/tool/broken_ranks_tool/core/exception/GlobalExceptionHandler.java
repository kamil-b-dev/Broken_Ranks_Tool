package pl.brokenranks.tool.broken_ranks_tool.core.exception;

import java.util.HashMap;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Provides a consistent error response format for all API endpoints. */
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    /**
     * Converts invalid input exceptions into an HTTP 400 response.
     * @param ex Exception containing the validation or security message.
     * @return HTTP 400 response with a stable error and message structure.
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleIllegalArgumentException(
            IllegalArgumentException ex) {
        log.warn("Zablokowano nieprawidłowe żądanie: {}", ex.getMessage());

        Map<String, String> response = new HashMap<>();
        response.put("error", "Bad Request");
        response.put("message", ex.getMessage());

        return ResponseEntity.badRequest().body(response);
    }
}
