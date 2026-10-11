package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model;

import java.util.Map;
import java.util.function.Function;
import java.util.function.Supplier;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.NumericStats;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.input.EquipmentDataProvider.CalculationContext;

/** Lazily prepares calculator templates for one search, shared with its focused variants. */
public final class OptimizationCalculatorSession {
    private CalculationContext catalog;
    private Function<EquipmentRequest, NumericStats> numericCalculation;
    private boolean numericPrepared;
    private final Map<String, NumericStats> numericCache = new java.util.HashMap<>();

    public void catalog(CalculationContext catalog) {
        if (this.catalog != null) throw new IllegalStateException("Catalog already prepared");
        this.catalog = catalog;
    }

    public CalculationContext catalog() {
        return catalog;
    }

    public Map<String, NumericStats> numericCache() {
        return numericCache;
    }

    public NumericStats calculateNumeric(
            EquipmentRequest setup,
            Supplier<Function<EquipmentRequest, NumericStats>> preparation,
            Supplier<Map<String, String>> fallback) {
        if (!numericPrepared) {
            numericCalculation = preparation.get();
            numericPrepared = true;
        }
        return numericCalculation == null
                ? NumericStats.fromFormatted(fallback.get())
                : numericCalculation.apply(setup);
    }

    private final OptimizationSearchMetrics metrics = new OptimizationSearchMetrics();

    public OptimizationSearchMetrics metrics() {
        return metrics;
    }

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
