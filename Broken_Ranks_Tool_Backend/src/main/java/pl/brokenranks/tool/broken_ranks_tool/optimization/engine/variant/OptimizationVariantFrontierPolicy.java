package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.variant;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules.OptimizationRequestConstraints.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationStateEvaluator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result.OptimizationResultAssembler;

/** Profiles valid states and applies Pareto and acceptable-loss rules. */
@RequiredArgsConstructor
final class OptimizationVariantFrontierPolicy {
    private final OptimizationStateEvaluator stateEvaluator;
    private final OptimizationResultAssembler resultAssembler;

    boolean isEligible(BuildState state, OptimizationContext context) {
        return state != null
                && stateEvaluator.minimumsSatisfied(state, context)
                && forcedCapsSatisfied(state, context);
    }

    OptimizationVariantProfile profile(
            BuildState state, List<DRIF_BONUS_TYPE> trackedTypes, OptimizationContext context) {
        Map<DRIF_BONUS_TYPE, Double> values = new LinkedHashMap<>();
        for (DRIF_BONUS_TYPE type : trackedTypes) {
            values.put(type, resultAssembler.actualValue(state, type, context));
        }
        return new OptimizationVariantProfile(state, values);
    }

    boolean hasAcceptableCandidate(
            List<OptimizationVariantProfile> profiles,
            OptimizationVariantProfile main,
            DRIF_BONUS_TYPE focus,
            List<DRIF_BONUS_TYPE> trackedTypes,
            OptimizationContext context) {
        return profiles.stream()
                .anyMatch(
                        candidate ->
                                candidate != main
                                        && improves(candidate, main, focus)
                                        && acceptableLoss(
                                                candidate, main, focus, trackedTypes, context));
    }

    boolean dominates(
            OptimizationVariantProfile left,
            OptimizationVariantProfile right,
            List<DRIF_BONUS_TYPE> focuses) {
        if (left == right) return false;
        boolean noWorse =
                focuses.stream()
                        .allMatch(
                                type ->
                                        left.values().get(type)
                                                >= right.values().get(type) - TARGET_TOLERANCE);
        boolean better =
                focuses.stream()
                        .anyMatch(
                                type ->
                                        left.values().get(type)
                                                > right.values().get(type) + TARGET_TOLERANCE);
        return noWorse && better;
    }

    boolean improves(
            OptimizationVariantProfile candidate,
            OptimizationVariantProfile main,
            DRIF_BONUS_TYPE focus) {
        return candidate.values().get(focus) > main.values().get(focus) + TARGET_TOLERANCE;
    }

    boolean acceptableLoss(
            OptimizationVariantProfile candidate,
            OptimizationVariantProfile main,
            DRIF_BONUS_TYPE focus,
            List<DRIF_BONUS_TYPE> trackedTypes,
            OptimizationContext context) {
        for (DRIF_BONUS_TYPE type : trackedTypes) {
            if (type == focus) continue;
            double mainValue = main.values().get(type);
            double allowedLoss =
                    Math.max(1.0, Math.abs(mainValue)) * maxVariantRelativeLoss(context.request());
            if (candidate.values().get(type) < mainValue - allowedLoss - TARGET_TOLERANCE)
                return false;
        }
        return true;
    }

    private boolean forcedCapsSatisfied(BuildState state, OptimizationContext context) {
        for (DRIF_BONUS_TYPE type : context.request().getPriorities().keySet()) {
            if (!isForcedTarget(type, context.request())) continue;
            Double target = targetFor(type, context.request());
            if (target != null
                    && resultAssembler.actualValue(state, type, context)
                            < target - TARGET_TOLERANCE) return false;
        }
        return true;
    }
}
