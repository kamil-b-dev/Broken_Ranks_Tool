package pl.brokenranks.tool.broken_ranks_tool.core.ratelimit;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Configurable request limits for public, computationally expensive endpoints. */
@ConfigurationProperties("abuse-protection")
public record AbuseProtectionProperties(int maxRequestBytes, Limit optimizer, Limit calculator) {

    public AbuseProtectionProperties {
        if (maxRequestBytes <= 0 || optimizer == null || calculator == null) {
            throw new IllegalArgumentException("Abuse-protection limits must be configured.");
        }
    }

    /** Per-client and whole-instance allowance within one minute. */
    public record Limit(int clientRequestsPerMinute, int globalRequestsPerMinute) {

        public Limit {
            if (clientRequestsPerMinute <= 0 || globalRequestsPerMinute < clientRequestsPerMinute) {
                throw new IllegalArgumentException(
                        "Rate limits must be positive and the global limit cannot be lower than the client limit.");
            }
        }
    }
}
