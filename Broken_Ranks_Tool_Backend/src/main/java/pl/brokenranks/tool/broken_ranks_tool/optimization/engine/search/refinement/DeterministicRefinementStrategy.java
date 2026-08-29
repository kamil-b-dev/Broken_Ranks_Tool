package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.refinement;

import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.*;

/** Applies one deterministic refinement concern to a search state. */
interface DeterministicRefinementStrategy {
    BuildState refine(BuildState state, OptimizationContext context);
}
