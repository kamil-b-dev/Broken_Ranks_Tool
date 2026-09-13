package pl.brokenranks.tool.broken_ranks_tool.core.web.error;

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
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import pl.brokenranks.tool.broken_ranks_tool.core.web.filter.RequestTracingFilter;

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

        ApiException busy =
                new ApiException(
                        HttpStatus.TOO_MANY_REQUESTS,
                        "OPTIMIZER_BUSY",
                        "Optymalizator jest zajęty.");
        assertError(
                handler.handleApiException(busy),
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

    @Test
    void mapsInvalidPathParametersAndMissingResourcesWithoutAnInternalError() {
        assertError(
                handler.handleTypeMismatch(mock(MethodArgumentTypeMismatchException.class)),
                HttpStatus.BAD_REQUEST,
                "INVALID_REQUEST",
                "Nieprawidłowy parametr żądania.",
                null);

        assertError(
                handler.handleMissingResource(mock(NoResourceFoundException.class)),
                HttpStatus.NOT_FOUND,
                "NOT_FOUND",
                "Nie znaleziono zasobu.",
                null);
    }

    @Test
    void mapsUnsupportedContentTypesAndMethodsAsClientErrors() {
        assertError(
                handler.handleUnsupportedMediaType(mock(HttpMediaTypeNotSupportedException.class)),
                HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                "UNSUPPORTED_MEDIA_TYPE",
                "Endpoint przyjmuje żądania w formacie application/json.",
                null);

        assertError(
                handler.handleUnsupportedMethod(mock(HttpRequestMethodNotSupportedException.class)),
                HttpStatus.METHOD_NOT_ALLOWED,
                "METHOD_NOT_ALLOWED",
                "Ta metoda HTTP nie jest obsługiwana dla wskazanego zasobu.",
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
