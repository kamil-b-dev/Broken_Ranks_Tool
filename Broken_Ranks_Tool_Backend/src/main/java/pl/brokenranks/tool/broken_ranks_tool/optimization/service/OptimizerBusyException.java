package pl.brokenranks.tool.broken_ranks_tool.optimization.service;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** Signals that the bounded optimizer worker is already occupied. */
@ResponseStatus(HttpStatus.TOO_MANY_REQUESTS)
public class OptimizerBusyException extends RuntimeException {

    public OptimizerBusyException() {
        super("Optymalizator wykonuje obecnie inne zadanie. Spróbuj ponownie za chwilę.");
    }
}
