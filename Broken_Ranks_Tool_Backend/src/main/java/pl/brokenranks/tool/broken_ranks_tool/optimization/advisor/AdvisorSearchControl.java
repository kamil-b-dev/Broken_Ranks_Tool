package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import java.util.concurrent.atomic.AtomicBoolean;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.SearchStopReason;

/** Owns all mutable termination state for one bounded advisor search. */
final class AdvisorSearchControl {
    static final int STATE_LIMIT = 20_000;

    private final long deadline;
    private final AtomicBoolean cancelled;
    private int evaluated;
    private SearchStopReason stopped;

    AdvisorSearchControl(long deadline, AtomicBoolean cancelled) {
        this.deadline = deadline;
        this.cancelled = cancelled;
    }

    boolean running() {
        if (stopped != null) return false;
        if (cancelled.get()) stopped = SearchStopReason.CANCELLED;
        else if (Thread.currentThread().isInterrupted()) stopped = SearchStopReason.INTERRUPTED;
        else if (evaluated >= STATE_LIMIT) stopped = SearchStopReason.STATE_LIMIT;
        else if (System.nanoTime() >= deadline) stopped = SearchStopReason.TIME_LIMIT;
        return stopped == null;
    }

    SearchStopReason stopReason() {
        running();
        return stopped == null ? SearchStopReason.COMPLETED : stopped;
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
