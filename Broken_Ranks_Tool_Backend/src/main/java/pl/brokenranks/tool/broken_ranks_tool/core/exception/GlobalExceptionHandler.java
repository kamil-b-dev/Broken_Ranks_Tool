package pl.brokenranks.tool.broken_ranks_tool.core.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

/**
 * Centralizuje obsługę wyjątków w aplikacji, aby zapewnić spójny format
 * odpowiedzi błędów dla wszystkich endpointów API.
 */
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    /**
     * Obsługuje wyjątki {@link IllegalArgumentException}, które w tej aplikacji
     * są używane do sygnalizowania nieprawidłowych danych wejściowych (np. prób oszustwa).
     *
     * @param ex Przechwycony wyjątek.
     * @return Odpowiedź HTTP 400 (Bad Request) ze szczegółami błędu.
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleIllegalArgumentException(IllegalArgumentException ex) {
        log.warn("Zablokowano nieprawidłowe żądanie: {}", ex.getMessage());

        Map<String, String> response = new HashMap<>();
        response.put("error", "Bad Request");
        response.put("message", ex.getMessage());

        return ResponseEntity.badRequest().body(response);
    }
}
