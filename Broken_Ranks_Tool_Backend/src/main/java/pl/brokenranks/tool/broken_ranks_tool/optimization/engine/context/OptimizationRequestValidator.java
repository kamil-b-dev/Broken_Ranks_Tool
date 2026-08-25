package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.context;

import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints.validateQuantityRanges;

/** Validates the optimizer API contract before search data is loaded. */
public final class OptimizationRequestValidator {

    private OptimizationRequestValidator() { }

    public static String validate(OptimizationRequest request) {
        if (request == null || request.getOriginalSlots() == null
                || request.getOriginalSlots().isEmpty()) {
            return "Brak konfiguracji do optymalizacji.";
        }
        if (request.getPriorities() == null || request.getPriorities().isEmpty()) {
            return "Wybierz przynajmniej jeden modyfikator i ustaw jego priorytet.";
        }
        return validateQuantityRanges(request);
    }
}
