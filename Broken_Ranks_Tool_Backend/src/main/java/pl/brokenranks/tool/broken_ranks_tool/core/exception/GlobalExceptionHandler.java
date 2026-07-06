package pl.brokenranks.tool.broken_ranks_tool.core.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

/**
 * Globalny handler wyjątków dla całej aplikacji.
 * Przechwytuje określone wyjątki i zwraca spójne, sformatowane odpowiedzi HTTP.
 * Dzięki adnotacji {@link RestControllerAdvice} działa dla wszystkich kontrolerów.
 */
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    /**
     * Przechwytuje wyjątki {@link IllegalArgumentException}, które są często używane
     * do sygnalizowania nieprawidłowych danych wejściowych od użytkownika.
     *
     * @param ex Przechwycony wyjątek.
     * @return Odpowiedź HTTP 400 (Bad Request) z komunikatem błędu.
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
