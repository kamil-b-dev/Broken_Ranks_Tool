package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model;

import java.util.Map;
import java.util.function.Function;
import java.util.function.Supplier;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;

/** Lazily prepares calculator templates for one search, shared with its focused variants. */
public final class OptimizationCalculatorSession {
    private Function<EquipmentRequest, Map<String, String>> calculation;

    public Map<String, String> calculate(
            EquipmentRequest setup,
            Supplier<Function<EquipmentRequest, Map<String, String>>> preparation,
            Function<EquipmentRequest, Map<String, String>> fallback) {
        if (calculation == null) {
            calculation = preparation.get();
            if (calculation == null) calculation = fallback;
        }
        return calculation.apply(setup);
    }
}
