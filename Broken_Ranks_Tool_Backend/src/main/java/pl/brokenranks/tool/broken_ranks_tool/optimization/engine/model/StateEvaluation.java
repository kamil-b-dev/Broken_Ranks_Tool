package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model;

import lombok.RequiredArgsConstructor;

/** Cached metrics and lazily derived quality values for one build state. */
@RequiredArgsConstructor
public final class StateEvaluation {
    public final Metrics metrics;
    public Quality quality;
    public Double score;
}
