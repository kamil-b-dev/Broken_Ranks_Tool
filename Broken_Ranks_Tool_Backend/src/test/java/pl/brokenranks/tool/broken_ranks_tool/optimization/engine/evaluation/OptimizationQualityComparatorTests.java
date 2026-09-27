package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation;

import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.Quality;

class OptimizationQualityComparatorTests {
    private final OptimizationQualityComparator comparator = new OptimizationQualityComparator();

    @Test
    void prefersBalancedMaximizedModifiersBeforeWeightedUtility() {
        Quality balanced = quality(0.75, 1.50, 100.0);
        Quality lopsided = quality(0.40, 1.80, 120.0);

        assertTrue(comparator.compare(balanced, lopsided) > 0);
    }

    @Test
    void usesTotalMaximizedProgressWhenWorstProgressIsEqual() {
        Quality higherTotal = quality(0.75, 1.70, 100.0);
        Quality lowerTotal = quality(0.75, 1.50, 120.0);

        assertTrue(comparator.compare(higherTotal, lowerTotal) > 0);
    }

    private Quality quality(
            double minimumMaximizedProgress, double maximizedUtility, double weightedUtility) {
        return new Quality(
                0,
                0.0,
                minimumMaximizedProgress,
                maximizedUtility,
                weightedUtility,
                0.0,
                0.0,
                1.0,
                100);
    }
}
