package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.maximization;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints.targetFor;

import java.util.List;
import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationStateEvaluator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result.OptimizationResultAssembler;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.OptimizationStateEvaluation;

/** Compares maximization candidates using user-visible calculator values. */
@RequiredArgsConstructor
public final class OptimizationMaximizationStateComparator {
    private final OptimizationStateEvaluation stateEvaluation;
    private final OptimizationStateEvaluator stateEvaluator;
    private final OptimizationResultAssembler resultAssembler;

    public boolean isBetter(
            BuildState candidate,
            BuildState current,
            OptimizationContext context,
            List<DRIF_BONUS_TYPE> maximizedTypes) {
        ActualMaximizationQuality candidateQuality = quality(candidate, context, maximizedTypes);
        ActualMaximizationQuality currentQuality = quality(current, context, maximizedTypes);

        int comparison =
                Double.compare(
                        currentQuality.forcedTargetDeficit(),
                        candidateQuality.forcedTargetDeficit());
        if (comparison != 0) return comparison > 0;
        comparison =
                Double.compare(
                        candidateQuality.minimumProgress(), currentQuality.minimumProgress());
        if (comparison != 0) return comparison > 0;
        return Double.compare(
                        candidateQuality.weightedProgress(), currentQuality.weightedProgress())
                > 0;
    }

    private ActualMaximizationQuality quality(
            BuildState state, OptimizationContext context, List<DRIF_BONUS_TYPE> maximizedTypes) {
        double minimumProgress = Double.POSITIVE_INFINITY;
        double weightedProgress = 0.0;
        for (DRIF_BONUS_TYPE type : maximizedTypes) {
            double scale = stateEvaluator.maximizationScale(type, context);
            double progress =
                    scale > 0.0
                            ? Math.max(0.0, resultAssembler.actualValue(state, type, context))
                                    / scale
                            : 0.0;
            minimumProgress = Math.min(minimumProgress, progress);
            weightedProgress +=
                    progress * Math.max(1, stateEvaluation.priorityOf(type, context.request()));
        }
        if (maximizedTypes.isEmpty()) minimumProgress = 0.0;
        return new ActualMaximizationQuality(
                forcedTargetDeficit(state, context), minimumProgress, weightedProgress);
    }

    private double forcedTargetDeficit(BuildState state, OptimizationContext context) {
        double deficit = 0.0;
        for (DRIF_BONUS_TYPE type : context.request().getPriorities().keySet()) {
            Double target = targetFor(type, context.request());
            if (target == null) continue;
            int priority = Math.max(1, stateEvaluation.priorityOf(type, context.request()));
            deficit +=
                    Math.max(0.0, target - resultAssembler.actualValue(state, type, context))
                            * priority;
        }
        return deficit;
    }

    private record ActualMaximizationQuality(
            double forcedTargetDeficit, double minimumProgress, double weightedProgress) {}
}
