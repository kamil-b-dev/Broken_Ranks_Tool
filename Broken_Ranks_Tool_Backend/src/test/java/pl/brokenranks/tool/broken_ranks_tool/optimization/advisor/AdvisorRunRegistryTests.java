package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.Test;

class AdvisorRunRegistryTests {

    @Test
    void cancellationBeforeRegistrationIsAppliedOnlyToMatchingSecret() {
        assertThat(registry.cancel("pending", TOKEN)).isFalse();
        AtomicBoolean other = registry.start("pending", "another-secret");
        assertThat(other).isFalse();
        registry.finish("pending", other);
        assertThat(registry.start("pending", TOKEN)).isTrue();
    }

    @Test
    void pendingIntentsExpireAndStayBounded() {
        var clock = new java.util.concurrent.atomic.AtomicLong();
        var timed = new AdvisorRunRegistry(clock::get);
        timed.cancel("expired", TOKEN);
        clock.set(10_000_000_001L);
        var expired = timed.start("expired", TOKEN);
        assertThat(expired).isFalse();
        timed.finish("expired", expired);
        for (int i = 0; i < 129; i++) timed.cancel("pending-" + i, TOKEN);
        var evicted = timed.start("pending-0", TOKEN);
        assertThat(evicted).isFalse();
        timed.finish("pending-0", evicted);
        assertThat(timed.start("pending-128", TOKEN)).isTrue();
    }

    private static final String TOKEN = "cancel-token";

    private final AdvisorRunRegistry registry = new AdvisorRunRegistry();

    @Test
    void marksAnActiveRunAsCancelled() {
        AtomicBoolean cancellation = registry.start("run-1", TOKEN);

        assertThat(registry.cancel("run-1", TOKEN)).isTrue();
        assertThat(cancellation).isTrue();
    }

    @Test
    void removesFinishedRunsAndRejectsUnknownIdentifiers() {
        registry.start("run-1", TOKEN);
        registry.finish("run-1", registry.start("run-1", TOKEN));

        assertThat(registry.cancel("run-1", TOKEN)).isFalse();
        assertThat(registry.cancel("missing", TOKEN)).isFalse();
    }

    @Test
    void cancelsPreviousRunWithTheSameIdentifier() {
        AtomicBoolean previous = registry.start("run-1", TOKEN);

        registry.start("run-1", TOKEN);

        assertThat(previous).isTrue();
    }

    @Test
    void preventsConcurrentRunsWithDifferentIdentifiers() {
        registry.start("run-1", TOKEN);

        assertThatThrownBy(() -> registry.start("run-2", TOKEN))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Inna analiza Doradcy już trwa.");
    }

    @Test
    void preventsAReusedIdentifierFromReplacingARunWithoutItsSecret() {
        AtomicBoolean active = registry.start("run-1", TOKEN);

        assertThatThrownBy(() -> registry.start("run-1", "wrong-token"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Inna analiza Doradcy już trwa.");
        assertThat(active).isFalse();
    }

    @Test
    void replacesACancelledRunWithANewIdentifierBeforeTheOldRequestFinishes() {
        AtomicBoolean previous = registry.start("run-1", TOKEN);
        assertThat(registry.cancel("run-1", TOKEN)).isTrue();

        AtomicBoolean replacement = registry.start("run-2", TOKEN);
        registry.finish("run-1", previous);

        assertThat(replacement).isFalse();
        assertThat(registry.cancel("run-2", TOKEN)).isTrue();
    }

    @Test
    void toleratesMissingIdentifiersWithoutRegisteringThem() {
        AtomicBoolean cancellation = registry.start(null, null);
        registry.finish(null, cancellation);

        assertThat(cancellation).isFalse();
        assertThat(registry.cancel(null, null)).isFalse();
    }

    @Test
    void refusesCancellationWithASecretFromAnotherRun() {
        AtomicBoolean cancellation = registry.start("run-1", TOKEN);

        assertThat(registry.cancel("run-1", "wrong-token")).isFalse();
        assertThat(cancellation).isFalse();
    }
}
