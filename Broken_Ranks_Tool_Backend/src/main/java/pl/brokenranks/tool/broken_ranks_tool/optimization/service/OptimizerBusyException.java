package pl.brokenranks.tool.broken_ranks_tool.optimization.service;

import org.springframework.http.HttpStatus;
import pl.brokenranks.tool.broken_ranks_tool.core.web.error.ApiException;

/** Signals that the bounded optimizer worker is already occupied. */
public class OptimizerBusyException extends ApiException {

    public OptimizerBusyException() {
        super(
                HttpStatus.TOO_MANY_REQUESTS,
                "OPTIMIZER_BUSY",
                "Optymalizator wykonuje obecnie inne zadanie. Spróbuj ponownie za chwilę.");
    }
}
