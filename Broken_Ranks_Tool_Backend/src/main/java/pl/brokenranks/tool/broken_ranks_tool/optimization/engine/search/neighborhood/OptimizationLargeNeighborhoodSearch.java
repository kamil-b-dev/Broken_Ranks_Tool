package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.neighborhood;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.*;

import java.util.ArrayList;
import java.util.List;

/** Rebuilds bounded slot groups after directed promotion moves have been evaluated. */
public final class OptimizationLargeNeighborhoodSearch {

    private static final int MAX_GENERATED_STATES = 40_000;
    private static final int GROUP_BEAM_WIDTH = 24;
    private static final int ACTUAL_FINALISTS_PER_GROUP = 4;
    private static final int MAX_ROUNDS = 2;

    private final OptimizationActualStateComparator actualStateComparator;
    private final OptimizationNeighborhoodSupport neighborhoodSupport;
    private final OptimizationDirectedMoveSearch directedMoveSearch;
    private final OptimizationNeighborhoodGroupPlanner groupPlanner;
    private final OptimizationSlotNeighborGenerator neighborGenerator;

    public OptimizationLargeNeighborhoodSearch(
            OptimizationActualStateComparator actualStateComparator,
            OptimizationNeighborhoodSupport neighborhoodSupport,
            OptimizationDirectedMoveSearch directedMoveSearch,
            OptimizationNeighborhoodGroupPlanner groupPlanner,
            OptimizationSlotNeighborGenerator neighborGenerator) {
        this.actualStateComparator = actualStateComparator;
        this.neighborhoodSupport = neighborhoodSupport;
        this.directedMoveSearch = directedMoveSearch;
        this.groupPlanner = groupPlanner;
        this.neighborGenerator = neighborGenerator;
    }

    public SearchResult improve(BuildState initial, OptimizationContext context) {
        return improve(initial, context, MAX_GENERATED_STATES);
    }

    public SearchResult improve(
            BuildState initial, OptimizationContext context, int maxGeneratedStates) {
        OptimizationNeighborhoodSearchControl control =
                new OptimizationNeighborhoodSearchControl(maxGeneratedStates);
        control.rememberEvaluated(initial);
        BuildState best = directedMoveSearch.improve(initial, context, control);
        List<List<SlotContext>> groups = groupPlanner.createGroups(context.slots());
        for (int round = 0; round < MAX_ROUNDS && !control.exhausted(); round++) {
            String before = best.signature();
            best = improveGroups(best, groups, context, control);
            if (before.equals(best.signature())) break;
        }
        return new SearchResult(best, control.evaluatedStates());
    }

    private BuildState improveGroups(
            BuildState state,
            List<List<SlotContext>> groups,
            OptimizationContext context,
            OptimizationNeighborhoodSearchControl control) {
        for (List<SlotContext> group : groups) {
            if (control.exhausted()) break;
            state = improveGroup(state, group, context, control);
        }
        return state;
    }

    private BuildState improveGroup(
            BuildState current,
            List<SlotContext> group,
            OptimizationContext context,
            OptimizationNeighborhoodSearchControl control) {
        List<BuildState> beam = List.of(current);
        for (SlotContext slot : group) {
            List<BuildState> expanded = new ArrayList<>();
            for (BuildState state : beam) {
                if (control.exhausted()) break;
                expanded.addAll(neighborGenerator.generate(state, slot, context, control));
            }
            beam =
                    neighborhoodSupport.retainApproximateBeam(expanded, context).stream()
                            .limit(GROUP_BEAM_WIDTH)
                            .toList();
            if (beam.isEmpty() || control.exhausted()) break;
        }
        return bestActualFinalist(current, beam, context, control);
    }

    private BuildState bestActualFinalist(
            BuildState current,
            List<BuildState> beam,
            OptimizationContext context,
            OptimizationNeighborhoodSearchControl control) {
        BuildState best = current;
        for (BuildState candidate : beam.stream().limit(ACTUAL_FINALISTS_PER_GROUP).toList()) {
            control.rememberEvaluated(candidate);
            if (!candidate.signature().equals(best.signature())
                    && actualStateComparator.isBetter(candidate, best, context)) {
                best = candidate;
            }
        }
        return best;
    }

    public record SearchResult(BuildState best, List<BuildState> evaluatedStates) {}
}
