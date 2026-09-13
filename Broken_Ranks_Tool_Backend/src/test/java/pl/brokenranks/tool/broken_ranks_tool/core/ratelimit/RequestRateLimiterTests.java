package pl.brokenranks.tool.broken_ranks_tool.core.ratelimit;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class RequestRateLimiterTests {

    private static final AbuseProtectionProperties.Limit LIMIT =
            new AbuseProtectionProperties.Limit(2, 3);

    @Test
    void enforcesThePerClientLimit() {
        MutableClock clock = new MutableClock(Instant.parse("2026-09-12T10:00:00Z"));
        RequestRateLimiter limiter = new RequestRateLimiter(clock);

        assertThat(limiter.acquire("optimizer", "client-a", LIMIT).allowed()).isTrue();
        assertThat(limiter.acquire("optimizer", "client-a", LIMIT).allowed()).isTrue();

        RequestRateLimiter.Decision rejected = limiter.acquire("optimizer", "client-a", LIMIT);
        assertThat(rejected.allowed()).isFalse();
        assertThat(rejected.retryAfterSeconds()).isEqualTo(60);
    }

    @Test
    void globalLimitStillAppliesWhenClientsUseDifferentIdentifiers() {
        RequestRateLimiter limiter =
                new RequestRateLimiter(new MutableClock(Instant.parse("2026-09-12T10:00:15Z")));

        assertThat(limiter.acquire("optimizer", "client-a", LIMIT).allowed()).isTrue();
        assertThat(limiter.acquire("optimizer", "client-b", LIMIT).allowed()).isTrue();
        assertThat(limiter.acquire("optimizer", "client-c", LIMIT).allowed()).isTrue();

        RequestRateLimiter.Decision rejected = limiter.acquire("optimizer", "client-d", LIMIT);
        assertThat(rejected.allowed()).isFalse();
        assertThat(rejected.retryAfterSeconds()).isEqualTo(45);
    }

    @Test
    void startsWithFreshAllowancesInTheNextWindow() {
        MutableClock clock = new MutableClock(Instant.parse("2026-09-12T10:00:59Z"));
        RequestRateLimiter limiter = new RequestRateLimiter(clock);
        limiter.acquire("optimizer", "client-a", LIMIT);
        limiter.acquire("optimizer", "client-a", LIMIT);

        clock.advanceSeconds(1);

        assertThat(limiter.acquire("optimizer", "client-a", LIMIT).allowed()).isTrue();
    }

    @Test
    void keepsAllowancesForDifferentPoliciesIndependent() {
        RequestRateLimiter limiter =
                new RequestRateLimiter(new MutableClock(Instant.parse("2026-09-12T10:00:00Z")));

        limiter.acquire("optimizer", "client-a", LIMIT);
        limiter.acquire("optimizer", "client-a", LIMIT);

        assertThat(limiter.acquire("calculator", "client-a", LIMIT).allowed()).isTrue();
    }

    @Test
    void aClientRejectionDoesNotConsumeTheGlobalAllowance() {
        RequestRateLimiter limiter =
                new RequestRateLimiter(new MutableClock(Instant.parse("2026-09-12T10:00:00Z")));
        AbuseProtectionProperties.Limit onePerClient = new AbuseProtectionProperties.Limit(1, 2);

        assertThat(limiter.acquire("optimizer", "client-a", onePerClient).allowed()).isTrue();
        assertThat(limiter.acquire("optimizer", "client-a", onePerClient).allowed()).isFalse();
        assertThat(limiter.acquire("optimizer", "client-b", onePerClient).allowed()).isTrue();
        assertThat(limiter.acquire("optimizer", "client-c", onePerClient).allowed()).isFalse();
    }

    private static final class MutableClock extends Clock {
        private Instant instant;

        private MutableClock(Instant instant) {
            this.instant = instant;
        }

        private void advanceSeconds(long seconds) {
            instant = instant.plusSeconds(seconds);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return instant;
        }
    }
}
