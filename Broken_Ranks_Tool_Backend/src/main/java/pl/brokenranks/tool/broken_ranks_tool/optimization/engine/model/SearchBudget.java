package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model;

/** Mutable operation budget that bounds one optimization search stage. */
public final class SearchBudget {
    private final int initial;
    private int remaining;

    public SearchBudget(int operations) {
        initial = Math.max(0, operations);
        remaining = initial;
    }

    public int initial() {
        return initial;
    }

    public int consumed() {
        return initial - remaining;
    }

    public int remaining() {
        return remaining;
    }

    public boolean tryConsume() {
        if (remaining <= 0) return false;
        remaining--;
        return true;
    }

    public boolean exhausted() {
        return remaining <= 0;
    }
}
