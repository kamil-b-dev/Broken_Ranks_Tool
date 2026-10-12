package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.pipeline;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result.OptimizationResultAssembler;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.neighborhood.OptimizationActualStateComparator;

/** Owns detached, calculator-verified checkpoints while transformations explore worse states. */
final class OptimizationCheckpoints {
    private final OptimizationResultAssembler assembler;
    private final OptimizationActualStateComparator comparator;
    private final OptimizationContext context;
    private final Map<String, BuildState> states = new LinkedHashMap<>();
    private BuildState best;

    OptimizationCheckpoints(
            OptimizationResultAssembler assembler,
            OptimizationActualStateComparator comparator,
            OptimizationContext context) {
        this.assembler = assembler;
        this.comparator = comparator;
        this.context = context;
    }

    void remember(BuildState candidate) {
        long started = System.nanoTime();
        try {
            rememberCandidate(candidate);
        } finally {
            context.calculatorSession().metrics().recordStage("checkpoints", started, context);
        }
    }

    private void rememberCandidate(BuildState candidate) {
        if (candidate == null
                || states.containsKey(candidate.signature())
                || assembler.validateFinalResult(candidate, context) != null) return;
        try {
            for (var type : context.request().getPriorities().keySet()) {
                assembler.actualValue(candidate, type, context);
            }
            BuildState snapshot = candidate.copy();
            states.put(snapshot.signature(), snapshot);
            if (best == null || comparator.isBetter(snapshot, best, context)) best = snapshot;
        } catch (IllegalArgumentException invalidEquipment) {
            // A search transformation can be invalid; never replace a verified checkpoint with it.
        }
    }

    List<BuildState> seeds() {
        if (best == null) return List.of();
        java.util.ArrayList<BuildState> result = new java.util.ArrayList<>();
        result.add(best.copy());
        for (BuildState state : states.values()) {
            if (!state.signature().equals(best.signature())) result.add(state.copy());
        }
        return result;
    }
}
