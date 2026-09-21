package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Set;
import org.junit.jupiter.api.Test;

class AdvisorChangeKeyTests {

    @Test
    void distinguishesChangeKindsAndDrifPositionsWithoutStringEncoding() {
        Set<AdvisorChangeKey> changes =
                Set.of(
                        new AdvisorChangeKey.Stars("helmet"),
                        new AdvisorChangeKey.Item("helmet"),
                        new AdvisorChangeKey.Drif("helmet", 0));

        assertThat(changes).hasSize(3);
        assertThat(changes).contains(new AdvisorChangeKey.Drif("helmet", 0));
        assertThat(changes).doesNotContain(new AdvisorChangeKey.Drif("helmet", 1));
    }

    @Test
    void rejectsNegativeDrifPosition() {
        assertThatThrownBy(() -> new AdvisorChangeKey.Drif("helmet", -1))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
