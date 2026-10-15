package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints.*;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationSummary;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationStateEvaluator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationDrifSizeConstraints;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.variant.GeneratedOptimizationVariant;

/** Creates user-facing optimization goals, warnings, and summary metadata. */
final class OptimizationSummaryFactory {

    private final OptimizationStateEvaluator stateEvaluator;
    private final OptimizationCalculatorAdapter calculatorAdapter;
    private final OptimizationVariantSummaryFactory variantSummaryFactory;

    OptimizationSummaryFactory(
            OptimizationStateEvaluator stateEvaluator,
            OptimizationCalculatorAdapter calculatorAdapter,
            OptimizationSetupMapper setupMapper) {
        this.stateEvaluator = stateEvaluator;
        this.calculatorAdapter = calculatorAdapter;
        this.variantSummaryFactory =
                new OptimizationVariantSummaryFactory(
                        calculatorAdapter, setupMapper, stateEvaluator);
    }

    OptimizationSummary create(
            BuildState state,
            OptimizationContext context,
            double executionTime,
            List<String> warnings,
            List<GeneratedOptimizationVariant> variants) {
        Metrics metrics = stateEvaluator.metrics(state, context);
        Map<String, String> calculatorStats = calculatorAdapter.actualStats(state, context);
        List<String> reportedWarnings = new ArrayList<>(warnings);
        reportedWarnings.addAll(OptimizationDrifSizeConstraints.builtInWarnings(context));
        if (context.request().getForcedPercentageTargets() != null) {
            context.request().getForcedPercentageTargets().entrySet().stream()
                    .sorted(Map.Entry.comparingByKey())
                    .filter(
                            entry ->
                                    entry.getKey().getMaxCap() != null
                                            && entry.getValue()
                                                    > Math.abs(entry.getKey().getMaxCap()))
                    .forEach(
                            entry ->
                                    reportedWarnings.add(
                                            "Cel dla "
                                                    + entry.getKey().getDescription()
                                                    + " przekraczał cap i został ograniczony z "
                                                    + String.format(
                                                            java.util.Locale.ROOT,
                                                            "%.2f%%",
                                                            entry.getValue())
                                                    + " do "
                                                    + Math.abs(entry.getKey().getMaxCap())
                                                    + "%."));
        }
        return new OptimizationSummary(
                warnings.isEmpty(),
                resultMessage(warnings),
                totalDrifCount(metrics),
                metrics.totalPower(),
                executionTime,
                reportedWarnings,
                itemDrifBonusMap(context),
                goalResults(metrics, calculatorStats, context),
                variantSummaryFactory.create(state, variants, context));
    }

    List<String> forcedTargetWarnings(BuildState state, OptimizationContext context) {
        Map<String, String> actual = calculatorAdapter.actualStats(state, context);
        List<String> warnings = new ArrayList<>();
        for (DRIF_BONUS_TYPE type : forcedTargetTypes(context)) {
            Double target = targetFor(type, context.request());
            if (target == null) continue;
            if (!actual.containsKey(type.name())) {
                warnings.add(
                        "Kalkulator nie zwrócił wartości wymaganego celu: "
                                + type.getDescription()
                                + ".");
                continue;
            }
            addUnmetTargetWarning(warnings, actual.get(type.name()), type, target, context);
        }
        addSimpleQuantityWarnings(warnings, stateEvaluator.metrics(state, context), context);
        return warnings;
    }

    private void addSimpleQuantityWarnings(
            List<String> warnings, Metrics metrics, OptimizationContext context) {
        Map<DRIF_BONUS_TYPE, Integer> preferred = context.request().getSimplePreferredQuantities();
        if (preferred == null) return;
        preferred.forEach(
                (type, expected) -> {
                    int placed = metrics.counts().getOrDefault(type, 0);
                    if (placed < expected) {
                        warnings.add(
                                "Preferowana liczba drifów dla "
                                        + type.getDescription()
                                        + ": "
                                        + expected
                                        + ", umieszczono: "
                                        + placed
                                        + ".");
                    }
                });
    }

    private String resultMessage(List<String> warnings) {
        return warnings.isEmpty()
                ? "Znaleziono poprawny układ drifów."
                : "Znaleziono układ drifów, ale nie wszystkie cele zostały osiągnięte.";
    }

    private int totalDrifCount(Metrics metrics) {
        return metrics.counts().values().stream().mapToInt(Integer::intValue).sum();
    }

    private List<OptimizationSummary.GoalResult> goalResults(
            Metrics metrics, Map<String, String> calculatorStats, OptimizationContext context) {
        return context.request().getPriorities().entrySet().stream()
                .sorted(
                        Map.Entry.<DRIF_BONUS_TYPE, Integer>comparingByValue()
                                .reversed()
                                .thenComparing(entry -> entry.getKey().name()))
                .map(entry -> goalResult(entry, metrics, calculatorStats, context))
                .toList();
    }

    private OptimizationSummary.GoalResult goalResult(
            Map.Entry<DRIF_BONUS_TYPE, Integer> priority,
            Metrics metrics,
            Map<String, String> calculatorStats,
            OptimizationContext context) {
        DRIF_BONUS_TYPE type = priority.getKey();
        var range = safeQuantities(context.request()).get(type);
        int count = metrics.counts().getOrDefault(type, 0);
        int minimum = range != null ? range.getMin() : 0;
        int maximum = range != null ? range.getMax() : Integer.MAX_VALUE;
        String calculatorValue = calculatorStats.get(type.name());
        Double target = targetFor(type, context.request());
        Boolean targetSatisfied = targetSatisfied(type, calculatorValue, target, context);
        String targetLabel =
                target == null ? null : String.format(java.util.Locale.ROOT, "%.2f%%", target);
        return new OptimizationSummary.GoalResult(
                type.name(),
                type.getDescription(),
                priority.getValue(),
                count,
                minimum,
                maximum,
                calculatorValue,
                targetLabel,
                count >= minimum && count <= maximum,
                targetSatisfied);
    }

    private Boolean targetSatisfied(
            DRIF_BONUS_TYPE type,
            String calculatorValue,
            Double target,
            OptimizationContext context) {
        if (target == null || calculatorValue == null) return null;
        return directedValue(type, calculatorAdapter.parseValue(calculatorValue), context.request())
                >= target - TARGET_TOLERANCE;
    }

    private Map<Double, List<OptimizationSummary.ItemDrifBonus>> itemDrifBonusMap(
            OptimizationContext context) {
        Map<Double, List<OptimizationSummary.ItemDrifBonus>> result = new LinkedHashMap<>();
        context.slotsByDrifBonus()
                .forEach(
                        (bonus, slots) ->
                                result.put(
                                        bonus,
                                        slots.stream()
                                                .map(
                                                        slot ->
                                                                new OptimizationSummary
                                                                        .ItemDrifBonus(
                                                                        slot.key(),
                                                                        slot.item().getName()))
                                                .toList()));
        return result;
    }

    private List<DRIF_BONUS_TYPE> forcedTargetTypes(OptimizationContext context) {
        return context.request().getPriorities().keySet().stream()
                .filter(type -> isForcedTarget(type, context.request()))
                .sorted(Comparator.comparing(Enum::name))
                .toList();
    }

    private void addUnmetTargetWarning(
            List<String> warnings,
            String actualValue,
            DRIF_BONUS_TYPE type,
            double target,
            OptimizationContext context) {
        double value =
                directedValue(type, calculatorAdapter.parseValue(actualValue), context.request());
        if (value >= target - TARGET_TOLERANCE) return;
        warnings.add(
                switch (type) {
                            case MANA_USAGE_REDUCTION -> "Redukcja zużycia many";
                            case STAMINA_USAGE_REDUCTION -> "Redukcja zużycia kondycji";
                            default -> type.getDescription();
                        }
                        + ": "
                        + formatPercentage(value)
                        + "% z "
                        + formatPercentage(target)
                        + "%; brakuje "
                        + formatPercentage(target - value)
                        + " p.p.");
    }

    private String formatPercentage(double value) {
        java.text.NumberFormat format =
                java.text.NumberFormat.getNumberInstance(java.util.Locale.forLanguageTag("pl-PL"));
        format.setMaximumFractionDigits(2);
        format.setGroupingUsed(false);
        return format.format(value);
    }
}
