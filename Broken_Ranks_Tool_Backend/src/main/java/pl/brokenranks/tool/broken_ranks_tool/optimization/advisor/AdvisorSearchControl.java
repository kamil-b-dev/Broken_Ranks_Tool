package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import java.util.concurrent.atomic.AtomicBoolean;

/** Owns all mutable termination state for one bounded advisor search. */
final class AdvisorSearchControl {
    static final int STATE_LIMIT = 20_000;

    private final long deadline;
    private final AtomicBoolean cancelled;
    private int evaluated;

    AdvisorSearchControl(long deadline, AtomicBoolean cancelled) {
        this.deadline = deadline;
        this.cancelled = cancelled;
    }

    boolean running() {
        return !cancelled.get()
                && !Thread.currentThread().isInterrupted()
                && evaluated < STATE_LIMIT
                && System.nanoTime() < deadline;
    }

    void recordEvaluation() {
        evaluated++;
    }

    boolean limited() {
        return evaluated >= STATE_LIMIT || System.nanoTime() >= deadline;
    }

    boolean cancelled() {
        return cancelled.get();
    }

    int evaluated() {
        return evaluated;
    }

    void exhaustForTest() {
        evaluated = STATE_LIMIT;
    }
}
