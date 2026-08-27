package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.*;

import java.util.Comparator;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;

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

    /** Compares only hard constraints, forced caps, and maximization objectives. */
    public boolean isBetterMaximizationState(
            BuildState candidate, BuildState current, OptimizationContext context) {
        Quality candidateQuality = quality(candidate, context);
        Quality currentQuality = quality(current, context);
        if (candidateQuality.hardViolations() != currentQuality.hardViolations())
            return candidateQuality.hardViolations() < currentQuality.hardViolations();
        int comparison =
                Double.compare(
                        currentQuality.forcedCapDeficit(), candidateQuality.forcedCapDeficit());
        if (comparison != 0) return comparison > 0;
        comparison =
                Double.compare(
                        candidateQuality.minimumMaximizedProgress(),
                        currentQuality.minimumMaximizedProgress());
        if (comparison != 0) return comparison > 0;
        return Double.compare(
                        candidateQuality.maximizedUtility(), currentQuality.maximizedUtility())
                > 0;
    }

    public Comparator<BuildState> stateComparator(OptimizationContext context) {
        return (left, right) -> {
            int comparison =
                    qualityComparator.compare(quality(left, context), quality(right, context));
            if (comparison != 0) return -comparison;
            return left.signature().compareTo(right.signature());
        };
    }

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

    public boolean minimumsSatisfied(BuildState state, OptimizationContext context) {
        return valueCalculator.minimumsSatisfied(metrics(state, context), context);
    }

    public Metrics metrics(BuildState state, OptimizationContext context) {
        return evaluation(state, context).metrics;
    }

    public double maximizationScale(DRIF_BONUS_TYPE type, OptimizationContext context) {
        return qualityCalculator.maximizationScale(type, context);
    }

    private Quality quality(BuildState state, OptimizationContext context) {
        return qualityCalculator.quality(evaluation(state, context), context);
    }

    private StateEvaluation evaluation(BuildState state, OptimizationContext context) {
        return evaluationCache.get(state, context, metricsCalculator);
    }
}
