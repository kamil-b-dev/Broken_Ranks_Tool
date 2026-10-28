package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.PriorityQueue;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_SIZE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.*;

/** Provides the optimization engine with cached state evaluation operations. */
public final class OptimizationStateEvaluator {
    private final OptimizationMetricsCalculator metricsCalculator;
    private final OptimizationQualityComparator qualityComparator;
    private final OptimizationEvaluationCache evaluationCache;
    private final OptimizationStateValueCalculator valueCalculator;
    private final OptimizationStateScoreCalculator scoreCalculator;
    private final OptimizationStateQualityCalculator qualityCalculator;

    public OptimizationStateEvaluator(EquipmentRulesRegistry rules) {
        metricsCalculator = new OptimizationMetricsCalculator(rules);
        qualityComparator = new OptimizationQualityComparator();
        evaluationCache = new OptimizationEvaluationCache();
        valueCalculator = new OptimizationStateValueCalculator();
        scoreCalculator = new OptimizationStateScoreCalculator(valueCalculator);
        qualityCalculator =
                new OptimizationStateQualityCalculator(rules, metricsCalculator, valueCalculator);
    }

    public boolean isBetterState(
            BuildState candidate, BuildState current, OptimizationContext context) {
        int comparison =
                qualityComparator.compare(quality(candidate, context), quality(current, context));
        if (comparison != 0) return comparison > 0;
        return candidate.signature().compareTo(current.signature()) < 0;
    }

    public Comparator<BuildState> stateComparator(OptimizationContext context) {
        return (left, right) -> {
            int comparison =
                    qualityComparator.compare(quality(left, context), quality(right, context));
            if (comparison != 0) return -comparison;
            return left.signature().compareTo(right.signature());
        };
    }

    /** Selects the same stable prefix as a full sort, evaluating each candidate only once. */
    public List<BuildState> bestStates(
            List<BuildState> states, int limit, OptimizationContext context) {
        if (limit <= 0 || states.isEmpty()) return List.of();
        Comparator<RankedState> order =
                (left, right) -> {
                    int comparison = qualityComparator.compare(left.quality(), right.quality());
                    if (comparison != 0) return -comparison;
                    comparison = left.state().signature().compareTo(right.state().signature());
                    return comparison != 0
                            ? comparison
                            : Integer.compare(left.index(), right.index());
                };
        var retained = new PriorityQueue<>(Math.min(limit, states.size()), order.reversed());
        for (int index = 0; index < states.size(); index++) {
            BuildState state = states.get(index);
            var ranked = new RankedState(state, quality(state, context), index);
            if (retained.size() < limit) retained.add(ranked);
            else if (order.compare(ranked, retained.peek()) < 0) {
                retained.poll();
                retained.add(ranked);
            }
        }
        var sorted = new ArrayList<>(retained);
        sorted.sort(order);
        return sorted.stream().map(RankedState::state).toList();
    }

    private record RankedState(BuildState state, Quality quality, int index) {}

    public double score(BuildState state, OptimizationContext context) {
        return scoreCalculator.score(evaluation(state, context), context);
    }

    public double calculatedValue(
            BuildState state, DRIF_BONUS_TYPE type, OptimizationContext context) {
        return valueCalculator.calculatedValue(metrics(state, context), type, context);
    }

    public double currentValue(
            BuildState state, DRIF_BONUS_TYPE type, OptimizationContext context) {
        return valueCalculator.currentValue(metrics(state, context), type, context);
    }

    public int globalCount(BuildState state, DRIF_BONUS_TYPE type, OptimizationContext context) {
        return valueCalculator.globalCount(metrics(state, context), type);
    }

    public int globalCountExcept(
            BuildState state,
            DRIF_BONUS_TYPE candidate,
            DRIF_BONUS_TYPE replaced,
            OptimizationContext context) {
        return valueCalculator.globalCountExcept(metrics(state, context), candidate, replaced);
    }

    public int sizeCount(
            BuildState state, DRIF_BONUS_TYPE type, DRIF_SIZE size, OptimizationContext context) {
        return valueCalculator.sizeCount(metrics(state, context), type, size);
    }

    public boolean minimumsSatisfied(BuildState state, OptimizationContext context) {
        return valueCalculator.minimumsSatisfied(metrics(state, context), context);
    }

    public Metrics metrics(BuildState state, OptimizationContext context) {
        return evaluation(state, context).metrics;
    }

    public double maximizationScale(DRIF_BONUS_TYPE type, OptimizationContext context) {
        return qualityCalculator.maximizationScale(type, context);
    }

    public Quality quality(BuildState state, OptimizationContext context) {
        return qualityCalculator.quality(evaluation(state, context), context);
    }

    /** Replaces approximate objective values with calculator values; all tie-breaks stay shared. */
    public Quality verifiedQuality(
            BuildState state,
            OptimizationContext context,
            java.util.function.ToDoubleFunction<DRIF_BONUS_TYPE> values) {
        return qualityCalculator.objectives(quality(state, context), context, values);
    }

    private StateEvaluation evaluation(BuildState state, OptimizationContext context) {
        return evaluationCache.get(state, context, metricsCalculator);
    }
}
