package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model;

import lombok.AllArgsConstructor;

/** Mutable operation budget that bounds one optimization search stage. */
@AllArgsConstructor
public final class SearchBudget {
    private int remaining;

    public boolean tryConsume() {
        if (remaining <= 0) return false;
        remaining--;
        return true;
    }

    public boolean exhausted() {
        return remaining <= 0;
    }
}
