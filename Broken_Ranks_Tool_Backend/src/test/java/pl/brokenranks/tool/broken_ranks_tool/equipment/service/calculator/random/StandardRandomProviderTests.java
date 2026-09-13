package pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.random;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class StandardRandomProviderTests {

    private final StandardRandomProvider random = new StandardRandomProvider();

    @Test
    void generatesValuesWithinTheRequestedRanges() {
        for (int iteration = 0; iteration < 100; iteration++) {
            assertThat(random.nextInt(7)).isBetween(0, 6);
            assertThat(random.nextDouble()).isGreaterThanOrEqualTo(0.0).isLessThan(1.0);
        }
    }

    @Test
    void rejectsANonPositiveIntegerBound() {
        assertThatThrownBy(() -> random.nextInt(0)).isInstanceOf(IllegalArgumentException.class);
    }
}
