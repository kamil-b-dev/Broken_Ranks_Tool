package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result;

import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationStateEvaluator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.GeneratedOptimizationVariant;

import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationSummary;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.*;

/** Creates user-facing optimization goals, warnings, and alternative summaries. */
@RequiredArgsConstructor
final class OptimizationSummaryFactory {

    private static final int MAX_VARIANT_CHANGES = 5;
    private static final int MAX_ALTERNATIVES = 4;
    private static final double MIN_DIVERSITY = 0.35;

    private final OptimizationStateEvaluator stateEvaluator;
    private final OptimizationCalculatorAdapter calculatorAdapter;
    private final OptimizationSetupMapper setupMapper;

    OptimizationSummary create(BuildState state, OptimizationContext context,
                               double executionTime, List<String> warnings,
                               List<GeneratedOptimizationVariant> variants) {
        Metrics metrics = stateEvaluator.metrics(state, context);
        Map<String, String> calculatorStats = calculatorAdapter.actualStats(state, context);
        return new OptimizationSummary(warnings.isEmpty(), resultMessage(warnings),
                totalDrifCount(metrics), metrics.totalPower(), executionTime, warnings,
                itemDrifBonusMap(context), goalResults(metrics, calculatorStats, context),
                nextVariants(state, variants, context));
    }

    List<String> forcedTargetWarnings(BuildState state, OptimizationContext context) {
        Map<String, String> actual = calculatorAdapter.actualStats(state, context);
        List<String> warnings = new ArrayList<>();
        for (DRIF_BONUS_TYPE type : forcedTargetTypes(context)) {
            Double target = targetFor(type, context.request());
            if (target == null) continue;
            if (!actual.containsKey(type.name())) {
                warnings.add("Kalkulator nie zwrócił wartości wymaganego celu: "
                        + type.getDescription() + ".");
                continue;
            }
            addUnmetTargetWarning(warnings, actual.get(type.name()), type, target, context);
        }
        return warnings;
    }

    private String resultMessage(List<String> warnings) {
        return warnings.isEmpty()
                ? "Optymalizacja zakończona."
                : "Nie udało się osiągnąć docelowego capa dla co najmniej jednego modyfikatora.";
    }

    private int totalDrifCount(Metrics metrics) {
        return metrics.counts().values().stream().mapToInt(Integer::intValue).sum();
    }

    private List<OptimizationSummary.GoalResult> goalResults(
            Metrics metrics, Map<String, String> calculatorStats,
            OptimizationContext context) {
        return context.request().getPriorities().entrySet().stream()
                .sorted(Map.Entry.<DRIF_BONUS_TYPE, Integer>comparingByValue().reversed()
                        .thenComparing(entry -> entry.getKey().name()))
                .map(entry -> goalResult(entry, metrics, calculatorStats, context))
                .toList();
    }

    private OptimizationSummary.GoalResult goalResult(
            Map.Entry<DRIF_BONUS_TYPE, Integer> priority, Metrics metrics,
            Map<String, String> calculatorStats, OptimizationContext context) {
        DRIF_BONUS_TYPE type = priority.getKey();
        var range = context.request().getTargetQuantities().get(type);
        int count = metrics.counts().getOrDefault(type, 0);
        int minimum = range != null ? range.getMin() : 0;
        int maximum = range != null ? range.getMax() : Integer.MAX_VALUE;
        String calculatorValue = calculatorStats.get(type.name());
        Double target = targetFor(type, context.request());
        Boolean targetSatisfied = targetSatisfied(type, calculatorValue, target, context);
        String targetLabel = target == null ? null
                : String.format(java.util.Locale.ROOT, "%.2f%%", target);
        return new OptimizationSummary.GoalResult(
                type.name(), type.getDescription(), priority.getValue(), count,
                minimum, maximum, calculatorValue, targetLabel,
                count >= minimum && count <= maximum, targetSatisfied);
    }

    private Boolean targetSatisfied(DRIF_BONUS_TYPE type, String calculatorValue,
                                    Double target, OptimizationContext context) {
        if (target == null || calculatorValue == null) return null;
        return directedValue(type, calculatorAdapter.parseValue(calculatorValue), context.request())
                >= target - TARGET_TOLERANCE;
    }

    private List<OptimizationSummary.OptimizationVariant> nextVariants(
            BuildState finalState, List<GeneratedOptimizationVariant> variants,
            OptimizationContext context) {
        OptimizationSummary.OptimizationVariant mainVariant = mainVariant(finalState, context);
        if (context.request().getMaximizeBonuses() == null
                || context.request().getMaximizeBonuses().isEmpty()) return List.of(mainVariant);

        List<VariantCandidate> candidates = variantCandidates(finalState, variants, context);
        List<VariantCandidate> pareto = candidates.stream()
                .filter(candidate -> candidates.stream().noneMatch(other -> dominates(other, candidate)))
                .sorted(Comparator.comparingDouble(VariantCandidate::score).reversed()
                        .thenComparing(candidate -> candidate.type().name())
                        .thenComparing(VariantCandidate::signature))
                .toList();
        List<OptimizationSummary.OptimizationVariant> result = new ArrayList<>();
        result.add(mainVariant);
        selectDiverse(pareto).stream()
                .map(candidate -> alternativeVariant(finalState, candidate, context))
                .forEach(result::add);
        return result;
    }

    private OptimizationSummary.OptimizationVariant mainVariant(
            BuildState finalState, OptimizationContext context) {
        return new OptimizationSummary.OptimizationVariant(true, "Wynik główny",
                0.0, 0.0, 0.0, 0.0, 0, 0.0,
                List.of(), List.of(), setupMapper.toSetup(finalState, context));
    }

    private List<VariantCandidate> variantCandidates(
            BuildState finalState, List<GeneratedOptimizationVariant> variants,
            OptimizationContext context) {
        List<VariantCandidate> candidates = new ArrayList<>();
        for (GeneratedOptimizationVariant generated : variants) {
            BuildState variant = generated.state();
            if (variant.signature().equals(finalState.signature())) continue;
            DRIF_BONUS_TYPE focus = generated.focus();
            double finalValue = calculatorAdapter.actualValue(finalState, focus, context);
            double variantValue = calculatorAdapter.actualValue(variant, focus, context);
            if (variantValue <= finalValue + TARGET_TOLERANCE) continue;
            List<OptimizationSummary.PlacementChange> changes = placementChanges(
                    finalState, variant, context);
            if (!changes.isEmpty() && changes.size() <= MAX_VARIANT_CHANGES) {
                candidates.add(new VariantCandidate(focus, finalValue, variantValue,
                        totalLoss(finalState, variant, focus, context), changes,
                        variant.signature(), variant));
            }
        }
        return candidates;
    }

    private OptimizationSummary.OptimizationVariant alternativeVariant(
            BuildState finalState, VariantCandidate candidate, OptimizationContext context) {
        return new OptimizationSummary.OptimizationVariant(
                false, candidate.type().getDescription(), candidate.finalValue(),
                candidate.variantValue(), candidate.gain(), candidate.totalLoss(),
                candidate.changes().size(), candidate.score(), candidate.changes(),
                statChanges(finalState, candidate.state(), context),
                setupMapper.toSetup(candidate.state(), context));
    }

    private double totalLoss(BuildState main, BuildState variant, DRIF_BONUS_TYPE focus,
                             OptimizationContext context) {
        return context.request().getPriorities().keySet().stream()
                .filter(type -> type != focus)
                .mapToDouble(type -> Math.max(0.0,
                        calculatorAdapter.actualValue(main, type, context)
                                - calculatorAdapter.actualValue(variant, type, context)))
                .sum();
    }

    private boolean dominates(VariantCandidate left, VariantCandidate right) {
        if (left == right) return false;
        boolean noWorse = left.gain() >= right.gain() - TARGET_TOLERANCE
                && left.totalLoss() <= right.totalLoss() + TARGET_TOLERANCE
                && left.changes().size() <= right.changes().size();
        boolean better = left.gain() > right.gain() + TARGET_TOLERANCE
                || left.totalLoss() < right.totalLoss() - TARGET_TOLERANCE
                || left.changes().size() < right.changes().size();
        return noWorse && better;
    }

    private List<VariantCandidate> selectDiverse(List<VariantCandidate> candidates) {
        List<VariantCandidate> selected = new ArrayList<>();
        for (VariantCandidate candidate : candidates) {
            boolean diverse = selected.stream().allMatch(existing ->
                    changeDistance(existing, candidate) >= MIN_DIVERSITY);
            if (diverse) selected.add(candidate);
            if (selected.size() == MAX_ALTERNATIVES) break;
        }
        return selected;
    }

    private double changeDistance(VariantCandidate left, VariantCandidate right) {
        Set<String> leftKeys = changeKeys(left.changes());
        Set<String> rightKeys = changeKeys(right.changes());
        Set<String> union = new HashSet<>(leftKeys);
        union.addAll(rightKeys);
        Set<String> intersection = new HashSet<>(leftKeys);
        intersection.retainAll(rightKeys);
        return union.isEmpty() ? 0.0
                : 1.0 - (double) intersection.size() / union.size();
    }

    private Set<String> changeKeys(List<OptimizationSummary.PlacementChange> changes) {
        return changes.stream()
                .map(change -> change.slotKey() + "|" + change.fromModifier()
                        + "|" + change.toModifier())
                .collect(Collectors.toSet());
    }

    private List<OptimizationSummary.StatChange> statChanges(
            BuildState finalState, BuildState variant, OptimizationContext context) {
        Map<String, String> finalStats = calculatorAdapter.actualStats(finalState, context);
        Map<String, String> variantStats = calculatorAdapter.actualStats(variant, context);
        Set<String> drifStatKeys = context.drifs().values().stream()
                .map(drif -> drif.getBonusType().name())
                .collect(Collectors.toSet());
        Set<String> keys = new TreeSet<>();
        keys.addAll(finalStats.keySet());
        keys.addAll(variantStats.keySet());
        return keys.stream()
                .filter(drifStatKeys::contains)
                .filter(key -> !sameStatValue(finalStats.get(key), variantStats.get(key)))
                .map(key -> new OptimizationSummary.StatChange(
                        key, finalStats.getOrDefault(key, "0"),
                        variantStats.getOrDefault(key, "0")))
                .toList();
    }

    private boolean sameStatValue(String left, String right) {
        if (left == null || right == null) return left == right;
        return Math.abs(calculatorAdapter.parseValue(left)
                - calculatorAdapter.parseValue(right)) <= TARGET_TOLERANCE;
    }

    private List<OptimizationSummary.PlacementChange> placementChanges(
            BuildState finalState, BuildState variant, OptimizationContext context) {
        List<OptimizationSummary.PlacementChange> changes = new ArrayList<>();
        for (SlotContext slot : context.slots()) {
            appendSlotChanges(changes, finalState.slots().getOrDefault(slot.key(), List.of()),
                    variant.slots().getOrDefault(slot.key(), List.of()), slot);
        }
        return changes;
    }

    private void appendSlotChanges(
            List<OptimizationSummary.PlacementChange> changes,
            List<Placement> finalPlacements, List<Placement> variantPlacements,
            SlotContext slot) {
        int positions = Math.max(finalPlacements.size(), variantPlacements.size());
        for (int position = 0; position < positions; position++) {
            Placement from = placementAt(finalPlacements, position);
            Placement to = placementAt(variantPlacements, position);
            if (samePlacement(from, to)) continue;
            changes.add(new OptimizationSummary.PlacementChange(
                    slot.key(), slot.item().getName(), modifierName(from), level(from),
                    modifierName(to), level(to)));
        }
    }

    private Placement placementAt(List<Placement> placements, int position) {
        return position < placements.size() ? placements.get(position) : null;
    }

    private boolean samePlacement(Placement left, Placement right) {
        if (left == null || right == null) return left == right;
        return left.drif().getId().equals(right.drif().getId())
                && left.level() == right.level();
    }

    private String modifierName(Placement placement) {
        return placement != null ? placement.drif().getBonusType().getDescription() : null;
    }

    private Integer level(Placement placement) {
        return placement != null ? placement.level() : null;
    }

    private Map<Double, List<OptimizationSummary.ItemDrifBonus>> itemDrifBonusMap(
            OptimizationContext context) {
        Map<Double, List<OptimizationSummary.ItemDrifBonus>> result = new LinkedHashMap<>();
        context.slotsByDrifBonus().forEach((bonus, slots) -> result.put(bonus, slots.stream()
                .map(slot -> new OptimizationSummary.ItemDrifBonus(
                        slot.key(), slot.item().getName()))
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
            List<String> warnings, String actualValue, DRIF_BONUS_TYPE type,
            double target, OptimizationContext context) {
        double value = directedValue(
                type, calculatorAdapter.parseValue(actualValue), context.request());
        if (value >= target - TARGET_TOLERANCE) return;
        String targetLabel = isForcedCap(type, context.request())
                ? "docelowego capa" : "wymuszonego procentu";
        warnings.add("Nie udało się osiągnąć " + targetLabel + " dla "
                + type.getDescription() + " ("
                + String.format(java.util.Locale.ROOT, "%.2f", value) + "/"
                + String.format(java.util.Locale.ROOT, "%.2f", target) + ").");
    }

    private record VariantCandidate(DRIF_BONUS_TYPE type, double finalValue,
                                    double variantValue, double totalLoss,
                                    List<OptimizationSummary.PlacementChange> changes,
                                    String signature, BuildState state) {
        private double gain() {
            return variantValue - finalValue;
        }

        private double score() {
            return gain() / (1.0 + totalLoss + changes.size() * 0.25);
        }
    }
}
