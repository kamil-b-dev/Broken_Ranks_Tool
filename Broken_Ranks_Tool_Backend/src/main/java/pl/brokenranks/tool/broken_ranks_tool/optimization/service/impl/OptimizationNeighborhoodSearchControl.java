package pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl.OptimizationSearchModel.BuildState;

/** Tracks the generated-state budget and calculator-verified neighborhood states. */
final class OptimizationNeighborhoodSearchControl {

    private int remainingStates;
    private final Map<String, BuildState> evaluatedStates = new LinkedHashMap<>();

    OptimizationNeighborhoodSearchControl(int remainingStates) {
        this.remainingStates = Math.max(1, remainingStates);
    }

    boolean tryConsume() {
        if (exhausted()) return false;
        remainingStates--;
        return true;
    }

    boolean exhausted() {
        return remainingStates <= 0;
    }

    List<BuildState> evaluatedStates() {
        return new ArrayList<>(evaluatedStates.values());
    }

    void rememberEvaluated(BuildState state) {
        evaluatedStates.putIfAbsent(state.signature(), state);
    }
}
