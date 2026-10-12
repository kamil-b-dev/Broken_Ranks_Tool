package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.neighborhood;

import lombok.RequiredArgsConstructor;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationQualityComparator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationStateEvaluator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result.OptimizationResultAssembler;

/** Compares calculator values with the same ordered policy used for approximate search. */
@RequiredArgsConstructor
public final class OptimizationActualStateComparator {
    private final OptimizationStateEvaluator stateEvaluator;
    private final OptimizationResultAssembler resultAssembler;
    private final OptimizationQualityComparator policy = new OptimizationQualityComparator();

    public boolean isBetter(BuildState candidate, BuildState current, OptimizationContext context) {
        return compare(candidate, current, context) > 0;
    }

    /** Positive means left is better, including the deterministic signature tie-break. */
    public int compare(BuildState candidate, BuildState current, OptimizationContext context) {
        int comparison = policy.compare(quality(candidate, context), quality(current, context));
        return comparison != 0 ? comparison : current.signature().compareTo(candidate.signature());
    }

    private Quality quality(BuildState state, OptimizationContext context) {
        return stateEvaluator.verifiedQuality(
                state, context, type -> resultAssembler.actualValue(state, type, context));
    }
}
