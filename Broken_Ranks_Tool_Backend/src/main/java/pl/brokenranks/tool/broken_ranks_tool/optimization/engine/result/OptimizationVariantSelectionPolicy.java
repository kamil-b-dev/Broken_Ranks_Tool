package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints.TARGET_TOLERANCE;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationSummary;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationQualityComparator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.BuildState;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.Quality;

/** Selects a small Pareto-optimal and behaviorally diverse set of alternatives. */
final class OptimizationVariantSelectionPolicy {
    private static final int MAX_ALTERNATIVES = 4;
    private static final double MIN_DIVERSITY = 0.35;

    List<Candidate> select(List<Candidate> candidates) {
        List<Candidate> pareto =
                candidates.stream()
                        .filter(
                                candidate ->
                                        candidates.stream()
                                                .noneMatch(other -> dominates(other, candidate)))
                        .sorted(
                                Comparator.comparingDouble(Candidate::score)
                                        .reversed()
                                        .thenComparing(candidate -> candidate.type().name())
                                        .thenComparing(Candidate::signature))
                        .toList();
        List<Candidate> selected = new ArrayList<>();
        for (Candidate candidate : pareto) {
            if (selected.stream()
                    .allMatch(existing -> distance(existing, candidate) >= MIN_DIVERSITY)) {
                selected.add(candidate);
            }
            if (selected.size() == MAX_ALTERNATIVES) break;
        }
        return selected;
    }

    private boolean dominates(Candidate left, Candidate right) {
        if (left == right) return false;
        if (left.usefulDeltas().equals(right.usefulDeltas())
                && left.quality() != null
                && right.quality() != null) {
            int quality =
                    new OptimizationQualityComparator().compare(left.quality(), right.quality());
            if (quality != 0) return quality > 0;
        }
        Set<DRIF_BONUS_TYPE> types = new HashSet<>(left.usefulDeltas().keySet());
        types.addAll(right.usefulDeltas().keySet());
        boolean noWorse =
                types.stream()
                                .allMatch(
                                        type ->
                                                left.usefulDeltas().getOrDefault(type, 0.0)
                                                        >= right.usefulDeltas()
                                                                        .getOrDefault(type, 0.0)
                                                                - 1e-8)
                        && left.totalLoss() <= right.totalLoss() + TARGET_TOLERANCE
                        && left.changes().size() <= right.changes().size();
        boolean better =
                types.stream()
                                .anyMatch(
                                        type ->
                                                left.usefulDeltas().getOrDefault(type, 0.0)
                                                        > right.usefulDeltas()
                                                                        .getOrDefault(type, 0.0)
                                                                + 1e-8)
                        || left.totalLoss() < right.totalLoss() - TARGET_TOLERANCE
                        || left.changes().size() < right.changes().size();
        return noWorse && better;
    }

    private double distance(Candidate left, Candidate right) {
        if (left.type() != right.type()) return 1.0;
        Set<String> leftKeys = keys(left.changes());
        Set<String> rightKeys = keys(right.changes());
        Set<String> union = new HashSet<>(leftKeys);
        union.addAll(rightKeys);
        Set<String> intersection = new HashSet<>(leftKeys);
        intersection.retainAll(rightKeys);
        return union.isEmpty() ? 0.0 : 1.0 - (double) intersection.size() / union.size();
    }

    private Set<String> keys(List<OptimizationSummary.PlacementChange> changes) {
        return changes.stream()
                .map(
                        change ->
                                change.slotKey()
                                        + "|"
                                        + change.fromModifier()
                                        + "|"
                                        + change.toModifier()
                                        + "|"
                                        + change.fromLevel()
                                        + "|"
                                        + change.toLevel())
                .collect(Collectors.toSet());
    }

    record Candidate(
            DRIF_BONUS_TYPE type,
            double finalValue,
            double variantValue,
            double totalLoss,
            List<OptimizationSummary.PlacementChange> changes,
            String signature,
            BuildState state,
            Map<DRIF_BONUS_TYPE, Double> usefulDeltas,
            Quality quality) {
        Candidate(
                DRIF_BONUS_TYPE type,
                double finalValue,
                double variantValue,
                double totalLoss,
                List<OptimizationSummary.PlacementChange> changes,
                String signature,
                BuildState state,
                Map<DRIF_BONUS_TYPE, Double> usefulDeltas) {
            this(
                    type,
                    finalValue,
                    variantValue,
                    totalLoss,
                    changes,
                    signature,
                    state,
                    usefulDeltas,
                    null);
        }

        Candidate(
                DRIF_BONUS_TYPE type,
                double finalValue,
                double variantValue,
                double totalLoss,
                List<OptimizationSummary.PlacementChange> changes,
                String signature,
                BuildState state) {
            this(
                    type,
                    finalValue,
                    variantValue,
                    totalLoss,
                    changes,
                    signature,
                    state,
                    Map.of(type, variantValue - finalValue));
        }

        double gain() {
            return usefulDeltas.getOrDefault(type, 0.0);
        }

        double score() {
            return gain() / (1.0 + totalLoss + changes.size() * 0.25);
        }
    }
}
