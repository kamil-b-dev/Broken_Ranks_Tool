package pl.brokenranks.tool.broken_ranks_tool.optimization.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class OptimizationPropertiesTests {

    @Test
    void acceptsPositiveRuntimeLimits() {
        OptimizationProperties result = new OptimizationProperties(1, 2, 3, 4);

        assertThat(result.beamSearchSteps()).isEqualTo(1);
        assertThat(result.maximizationSearchSteps()).isEqualTo(2);
        assertThat(result.refinementSearchSteps()).isEqualTo(3);
        assertThat(result.maxConcurrentRuns()).isEqualTo(4);
    }

    @Test
    void rejectsEveryNonPositiveLimit() {
        assertInvalid(new OptimizationPropertiesFactory(0, 1, 1, 1));
        assertInvalid(new OptimizationPropertiesFactory(1, 0, 1, 1));
        assertInvalid(new OptimizationPropertiesFactory(1, 1, 0, 1));
        assertInvalid(new OptimizationPropertiesFactory(1, 1, 1, 0));
        assertInvalid(new OptimizationPropertiesFactory(-1, 1, 1, 1));
    }

    private void assertInvalid(OptimizationPropertiesFactory values) {
        assertThatThrownBy(values::create)
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Optimizer limits must be positive.");
    }

    private record OptimizationPropertiesFactory(
            int beam, int maximization, int refinement, int concurrent) {
        OptimizationProperties create() {
            return new OptimizationProperties(beam, maximization, refinement, concurrent);
        }
    }
}
