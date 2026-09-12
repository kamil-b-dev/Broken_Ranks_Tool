package pl.brokenranks.tool.broken_ranks_tool.core.exception;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import pl.brokenranks.tool.broken_ranks_tool.core.config.RequestTracingFilter;
import pl.brokenranks.tool.broken_ranks_tool.optimization.service.OptimizerBusyException;

class GlobalExceptionHandlerTests {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @AfterEach
    void clearMdc() {
        MDC.clear();
    }

    @Test
    void mapsInvalidArgumentsAndPreservesTheRequestIdentifier() {
        MDC.put(RequestTracingFilter.REQUEST_ID, "request-123");

        var response = handler.handleIllegalArgumentException(new IllegalArgumentException("źle"));

        assertError(response, HttpStatus.BAD_REQUEST, "INVALID_REQUEST", "źle", "request-123");
    }

    @Test
    void mapsTheFirstValidationError() {
        BindingResult bindingResult = mock(BindingResult.class);
        when(bindingResult.getFieldErrors())
                .thenReturn(List.of(new FieldError("request", "itemStars", "musi być mniejsze")));
        MethodArgumentNotValidException exception = mock(MethodArgumentNotValidException.class);
        when(exception.getBindingResult()).thenReturn(bindingResult);

        var response = handler.handleValidation(exception);

        assertError(
                response,
                HttpStatus.BAD_REQUEST,
                "INVALID_REQUEST",
                "itemStars: musi być mniejsze",
                null);
    }

    @Test
    void usesAFallbackForValidationErrorsWithoutAField() {
        BindingResult bindingResult = mock(BindingResult.class);
        when(bindingResult.getFieldErrors()).thenReturn(List.of());
        MethodArgumentNotValidException exception = mock(MethodArgumentNotValidException.class);
        when(exception.getBindingResult()).thenReturn(bindingResult);

        var response = handler.handleValidation(exception);

        assertThat(response.getBody().message()).isEqualTo("Żądanie nie spełnia wymagań API.");
    }

    @Test
    void mapsMalformedJsonBusyOptimizerAndUnexpectedErrors() {
        assertError(
                handler.handleUnreadableMessage(mock(HttpMessageNotReadableException.class)),
                HttpStatus.BAD_REQUEST,
                "MALFORMED_JSON",
                "Nie można odczytać żądania JSON.",
                null);

        OptimizerBusyException busy = new OptimizerBusyException();
        assertError(
                handler.handleOptimizerBusy(busy),
                HttpStatus.TOO_MANY_REQUESTS,
                "OPTIMIZER_BUSY",
                busy.getMessage(),
                null);

        assertError(
                handler.handleUnexpectedException(new RuntimeException("sekret")),
                HttpStatus.INTERNAL_SERVER_ERROR,
                "INTERNAL_ERROR",
                "Wystąpił nieoczekiwany błąd serwera.",
                null);
    }

    private void assertError(
            org.springframework.http.ResponseEntity<ApiError> response,
            HttpStatus status,
            String code,
            String message,
            String requestId) {
        assertThat(response.getStatusCode()).isEqualTo(status);
        assertThat(response.getBody()).isEqualTo(new ApiError(code, message, requestId));
    }
}
