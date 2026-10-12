package pl.brokenranks.tool.broken_ranks_tool.optimization.service;

import org.springframework.http.HttpStatus;
import pl.brokenranks.tool.broken_ranks_tool.core.web.error.ApiErrorCode;
import pl.brokenranks.tool.broken_ranks_tool.core.web.error.ApiException;

/** Rejects new heavy work while the JVM needs heap headroom for ordinary requests. */
public final class OptimizerMemoryPressureException extends ApiException {
    public OptimizerMemoryPressureException() {
        super(
                HttpStatus.SERVICE_UNAVAILABLE,
                ApiErrorCode.OPTIMIZER_MEMORY_PRESSURE,
                "Serwer ma obecnie zbyt mało wolnej pamięci na nową optymalizację. Spróbuj ponownie za chwilę.");
    }
}
