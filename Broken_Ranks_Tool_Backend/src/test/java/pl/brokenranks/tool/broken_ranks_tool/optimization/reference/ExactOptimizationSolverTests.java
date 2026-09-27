package pl.brokenranks.tool.broken_ranks_tool.optimization.reference;

import static org.junit.jupiter.api.Assertions.*;

import java.time.Duration;
import java.util.Comparator;
import java.util.List;
import org.junit.jupiter.api.Test;

class ExactOptimizationSolverTests {

    @Test
    void provesTheBestFeasibleCombinationInASmallSpace() {
        var solver = solver(100);

        var result =
                solver.solve(
                        List.of(List.of(0, 1, 2), List.of(0, 1, 2)),
                        values -> values.stream().mapToInt(Integer::intValue).sum() <= 3,
                        Comparator.comparingInt(
                                        (List<Integer> values) ->
                                                values.stream().mapToInt(Integer::intValue).sum())
                                .reversed());

        assertEquals(ExactOptimizationSolver.Status.OPTIMAL, result.status());
        assertTrue(result.optimumProven());
        assertEquals(3, result.best().stream().mapToInt(Integer::intValue).sum());
        assertEquals(9, result.examinedStates());
        assertEquals(9, result.searchSpace());
    }

    @Test
    void distinguishesInfeasibilityFromAnInterruptedSearch() {
        var infeasible =
                solver(100)
                        .solve(
                                List.of(List.of(1, 2)),
                                ignored -> false,
                                Comparator.comparingInt(List::size));
        var limited =
                solver(2)
                        .solve(
                                List.of(List.of(1, 2), List.of(1, 2)),
                                ignored -> true,
                                Comparator.comparingInt(List::hashCode));

        assertEquals(ExactOptimizationSolver.Status.INFEASIBLE, infeasible.status());
        assertEquals(ExactOptimizationSolver.Status.TIME_LIMIT, limited.status());
        assertFalse(limited.optimumProven());
        assertEquals(2, limited.examinedStates());
    }

    @Test
    void supportsAllocationFreeIncrementalEvaluationForLargeBenchmarks() {
        var evaluation = new SumEvaluation();

        var result =
                solver(100)
                        .solveIncrementally(
                                List.of(List.of(0, 1, 2), List.of(0, 1, 2)), evaluation);

        assertEquals(ExactOptimizationSolver.Status.OPTIMAL, result.status());
        assertEquals(List.of(2, 2), result.best());
        assertEquals(4, evaluation.best);
        assertEquals(0, evaluation.current, "Selections must be undone after the search");
    }

    private ExactOptimizationSolver<Integer> solver(long maxStates) {
        return new ExactOptimizationSolver<>(
                new ExactOptimizationSolver.Limits(Duration.ofSeconds(1), maxStates));
    }

    private static final class SumEvaluation
            implements ExactOptimizationSolver.IncrementalEvaluation<Integer> {
        private int current;
        private int best = Integer.MIN_VALUE;

        @Override
        public void select(int dimension, Integer choice) {
            current += choice;
        }

        @Override
        public void unselect(int dimension, Integer choice) {
            current -= choice;
        }

        @Override
        public boolean feasible() {
            return true;
        }

        @Override
        public boolean betterThanRecordedBest() {
            return current > best;
        }

        @Override
        public void recordBest() {
            best = current;
        }
    }
}
