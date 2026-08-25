package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.neighborhood;

import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result.OptimizationResultAssembler;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationStateEvaluator;

import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;

import java.util.Map;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.BuildState;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.OptimizationContext;

/** Compares calculator-verified states using optimizer business priorities. */
@RequiredArgsConstructor
final class OptimizationActualStateComparator {

    private static final double MIN_ACTUAL_GAIN = 0.000_001;

    private final OptimizationStateEvaluator stateEvaluator;
    private final OptimizationResultAssembler resultAssembler;

    boolean isBetter(BuildState candidate, BuildState current, OptimizationContext context) {
        ActualQuality candidateQuality = quality(candidate, context);
        ActualQuality currentQuality = quality(current, context);
        int comparison = compareLowerIsBetter(candidateQuality.forcedTargetDeficit(),
                currentQuality.forcedTargetDeficit());
        if (comparison != 0) return comparison > 0;
        comparison = compareHigherIsBetter(candidateQuality.minimumMaximizedProgress(),
                currentQuality.minimumMaximizedProgress());
        if (comparison != 0) return comparison > 0;
        comparison = compareHigherIsBetter(candidateQuality.maximizedProgress(),
                currentQuality.maximizedProgress());
        if (comparison != 0) return comparison > 0;
        return compareHigherIsBetter(candidateQuality.weightedUtility(),
                currentQuality.weightedUtility()) > 0;
    }

    private ActualQuality quality(BuildState state, OptimizationContext context) {
        double forcedTargetDeficit = 0.0;
        double minimumMaximizedProgress = Double.POSITIVE_INFINITY;
        double maximizedProgress = 0.0;
        double weightedUtility = 0.0;
        boolean hasMaximizedTypes = false;

        for (Map.Entry<DRIF_BONUS_TYPE, Integer> entry
                : context.request().getPriorities().entrySet()) {
            DRIF_BONUS_TYPE type = entry.getKey();
            int priority = Math.max(1, entry.getValue() != null ? entry.getValue() : 1);
            double value = actualUtilityValue(state, type, context);
            Double target = targetFor(type, context.request());
            if (target != null) {
                forcedTargetDeficit += Math.max(0.0, target - value) * priority;
            }

            if (isMaximized(type, context.request())) {
                hasMaximizedTypes = true;
                double scale = stateEvaluator.maximizationScale(type, context);
                double progress = scale > 0.0 ? Math.max(0.0, value) / scale : 0.0;
                minimumMaximizedProgress = Math.min(minimumMaximizedProgress, progress);
                maximizedProgress += progress * priority;
            } else if (target != null) {
                weightedUtility += Math.min(value, target) * priority;
            } else {
                weightedUtility += value * priority;
            }
        }

        if (!hasMaximizedTypes) minimumMaximizedProgress = 0.0;
        return new ActualQuality(forcedTargetDeficit, minimumMaximizedProgress,
                maximizedProgress, weightedUtility);
    }

    private double actualUtilityValue(BuildState state, DRIF_BONUS_TYPE type,
                                      OptimizationContext context) {
        double value = resultAssembler.actualValue(state, type, context);
        if (!isForcedTarget(type, context.request()) && !isMaximized(type, context.request())
                && type.getMaxCap() != null && type.getMaxCap() < 0) {
            return -value;
        }
        return value;
    }

    private int compareHigherIsBetter(double candidate, double current) {
        if (candidate > current + MIN_ACTUAL_GAIN) return 1;
        if (candidate < current - MIN_ACTUAL_GAIN) return -1;
        return 0;
    }

    private int compareLowerIsBetter(double candidate, double current) {
        return compareHigherIsBetter(current, candidate);
    }

    private record ActualQuality(double forcedTargetDeficit,
                                 double minimumMaximizedProgress,
                                 double maximizedProgress,
                                 double weightedUtility) { }
}
