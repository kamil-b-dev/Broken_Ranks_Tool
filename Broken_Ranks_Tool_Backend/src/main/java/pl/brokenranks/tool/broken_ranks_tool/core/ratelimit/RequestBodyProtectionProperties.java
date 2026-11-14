package pl.brokenranks.tool.broken_ranks_tool.core.ratelimit;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/** Bounds request bodies waiting for network data independently of HTTP worker threads. */
@ConfigurationProperties("abuse-protection.body")
public record RequestBodyProtectionProperties(
        Duration timeout, int maxPendingRequests, @DefaultValue("2") int maxPendingPerClient) {
    public RequestBodyProtectionProperties {
        if (timeout == null
                || timeout.isNegative()
                || timeout.compareTo(Duration.ofMinutes(1)) > 0
                || timeout.toMillis() < 1
                || maxPendingRequests < 1
                || maxPendingRequests > 64
                || maxPendingPerClient < 1
                || maxPendingPerClient > maxPendingRequests) {
            throw new IllegalArgumentException("Nieprawidłowe limity odbierania żądań.");
        }
    }
}
