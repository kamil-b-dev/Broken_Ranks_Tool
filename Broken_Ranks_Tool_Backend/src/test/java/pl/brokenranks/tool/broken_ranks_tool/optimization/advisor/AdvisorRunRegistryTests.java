package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.Test;

class AdvisorRunRegistryTests {

    private final AdvisorRunRegistry registry = new AdvisorRunRegistry();

    @Test
    void marksAnActiveRunAsCancelled() {
        AtomicBoolean cancellation = registry.start("run-1");

        assertThat(registry.cancel("run-1")).isTrue();
        assertThat(cancellation).isTrue();
    }

    @Test
    void removesFinishedRunsAndRejectsUnknownIdentifiers() {
        registry.start("run-1");
        registry.finish("run-1");

        assertThat(registry.cancel("run-1")).isFalse();
        assertThat(registry.cancel("missing")).isFalse();
    }

    @Test
    void preventsTwoConcurrentRunsWithTheSameIdentifier() {
        registry.start("run-1");

        assertThatThrownBy(() -> registry.start("run-1"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Ta analiza już trwa.");
    }

    @Test
    void toleratesMissingIdentifiersWithoutRegisteringThem() {
        AtomicBoolean cancellation = registry.start(null);
        registry.finish(null);

        assertThat(cancellation).isFalse();
        assertThat(registry.cancel(null)).isFalse();
    }
}
