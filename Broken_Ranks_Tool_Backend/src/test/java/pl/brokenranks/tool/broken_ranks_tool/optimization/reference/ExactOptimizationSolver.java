package pl.brokenranks.tool.broken_ranks_tool.optimization.reference;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.function.Predicate;

/**
 * Development-only exhaustive solver for bounded Cartesian search spaces.
 *
 * <p>The class lives in test sources intentionally: it is available to automatic oracle tests and
 * manually enabled benchmarks, but cannot be exposed by the production Spring application.
 */
public final class ExactOptimizationSolver<T> {

    /** Mutable callback used by large benchmarks to avoid allocating a candidate at every leaf. */
    public interface IncrementalEvaluation<T> {
        void select(int dimension, T choice);

        void unselect(int dimension, T choice);

        default boolean canContinue(int nextDimension) {
            return true;
        }

        boolean feasible();

        boolean betterThanRecordedBest();

        void recordBest();
    }

    public enum Status {
        OPTIMAL,
        INFEASIBLE,
        TIME_LIMIT
    }

    public record Limits(Duration timeLimit, long maxExaminedStates) {
        public Limits {
            Objects.requireNonNull(timeLimit, "timeLimit");
            if (timeLimit.isNegative() || timeLimit.isZero()) {
                throw new IllegalArgumentException("timeLimit must be positive");
            }
            if (maxExaminedStates < 1) {
                throw new IllegalArgumentException("maxExaminedStates must be positive");
            }
        }
    }

    public record Result<T>(
            Status status, List<T> best, long examinedStates, Duration elapsed, long searchSpace) {
        public boolean optimumProven() {
            return status == Status.OPTIMAL;
        }
    }

    private final Limits limits;
    private long deadlineNanos;
    private long examined;
    private boolean limitReached;
    private List<T> best;

    public ExactOptimizationSolver(Limits limits) {
        this.limits = Objects.requireNonNull(limits);
    }

    public Result<T> solve(
            List<? extends List<T>> dimensions,
            Predicate<List<T>> feasible,
            Comparator<List<T>> bestFirstComparator) {
        Objects.requireNonNull(dimensions);
        Objects.requireNonNull(feasible);
        Objects.requireNonNull(bestFirstComparator);
        reset();
        long started = System.nanoTime();
        deadlineNanos = saturatingAdd(started, limits.timeLimit().toNanos());
        long searchSpace = searchSpace(dimensions);
        if (dimensions.stream().anyMatch(List::isEmpty)) {
            return result(Status.INFEASIBLE, started, searchSpace);
        }

        enumerate(dimensions, feasible, bestFirstComparator, 0, new ArrayList<>());
        Status status =
                limitReached
                        ? Status.TIME_LIMIT
                        : best == null ? Status.INFEASIBLE : Status.OPTIMAL;
        return result(status, started, searchSpace);
    }

    public Result<T> solveIncrementally(
            List<? extends List<T>> dimensions, IncrementalEvaluation<T> evaluation) {
        Objects.requireNonNull(dimensions);
        Objects.requireNonNull(evaluation);
        reset();
        long started = System.nanoTime();
        deadlineNanos = saturatingAdd(started, limits.timeLimit().toNanos());
        long searchSpace = searchSpace(dimensions);
        if (dimensions.stream().anyMatch(List::isEmpty)) {
            return result(Status.INFEASIBLE, started, searchSpace);
        }

        enumerateIncrementally(dimensions, evaluation, 0, new ArrayList<>());
        Status status =
                limitReached
                        ? Status.TIME_LIMIT
                        : best == null ? Status.INFEASIBLE : Status.OPTIMAL;
        return result(status, started, searchSpace);
    }

    private void enumerate(
            List<? extends List<T>> dimensions,
            Predicate<List<T>> feasible,
            Comparator<List<T>> comparator,
            int index,
            List<T> partial) {
        if (limitReached || limitExceeded()) return;
        if (index == dimensions.size()) {
            examined++;
            List<T> candidate = List.copyOf(partial);
            if (feasible.test(candidate)
                    && (best == null || comparator.compare(candidate, best) < 0)) {
                best = candidate;
            }
            return;
        }
        for (T choice : dimensions.get(index)) {
            partial.add(choice);
            enumerate(dimensions, feasible, comparator, index + 1, partial);
            partial.removeLast();
            if (limitReached) return;
        }
    }

    private void enumerateIncrementally(
            List<? extends List<T>> dimensions,
            IncrementalEvaluation<T> evaluation,
            int index,
            List<T> partial) {
        if (limitReached || limitExceeded()) return;
        if (index == dimensions.size()) {
            examined++;
            if (evaluation.feasible() && evaluation.betterThanRecordedBest()) {
                evaluation.recordBest();
                best = List.copyOf(partial);
            }
            return;
        }
        for (T choice : dimensions.get(index)) {
            partial.add(choice);
            evaluation.select(index, choice);
            if (evaluation.canContinue(index + 1)) {
                enumerateIncrementally(dimensions, evaluation, index + 1, partial);
            }
            evaluation.unselect(index, choice);
            partial.removeLast();
            if (limitReached) return;
        }
    }

    private boolean limitExceeded() {
        if (examined >= limits.maxExaminedStates() || System.nanoTime() >= deadlineNanos) {
            limitReached = true;
            return true;
        }
        return false;
    }

    private Result<T> result(Status status, long started, long searchSpace) {
        return new Result<>(
                status,
                best == null ? List.of() : List.copyOf(best),
                examined,
                Duration.ofNanos(System.nanoTime() - started),
                searchSpace);
    }

    private void reset() {
        examined = 0;
        limitReached = false;
        best = null;
    }

    private long searchSpace(List<? extends List<T>> dimensions) {
        long product = 1;
        for (List<T> dimension : dimensions) {
            if (dimension.isEmpty()) return 0;
            if (product > Long.MAX_VALUE / dimension.size()) return Long.MAX_VALUE;
            product *= dimension.size();
        }
        return product;
    }

    private long saturatingAdd(long left, long right) {
        if (right > 0 && left > Long.MAX_VALUE - right) return Long.MAX_VALUE;
        return left + right;
    }
}
