package pl.brokenranks.tool.broken_ranks_tool.core.ratelimit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.convention.TestBean;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationResponse;
import pl.brokenranks.tool.broken_ranks_tool.optimization.service.ModsOptimizationService;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
            "spring.datasource.url=jdbc:sqlite:file:database/catalog/broken_ranks.db?mode=ro",
            "abuse-protection.optimizer-ingress.client-requests-per-minute=60",
            "abuse-protection.optimizer-ingress.global-requests-per-minute=600",
            "abuse-protection.trust-railway-client-ip=true",
            "server.tomcat.remoteip.internal-proxies=^$"
        })
@ActiveProfiles("prod")
class ValidatedCalculationRateLimitIntegrationTests {
    private static final String VALID =
            "{\"originalSlots\":{\"helmet\":{\"itemId\":1}},\"priorities\":{\"DAMAGE_MAGIC\":1}}";
    @LocalServerPort private int port;
    @MockitoBean private ModsOptimizationService optimization;

    @TestBean(enforceOverride = true)
    private ValidatedCalculationRateLimiter validatedCalculationRateLimiter;

    private final HttpClient client = HttpClient.newHttpClient();
    private final AtomicInteger spoofedForwardedAddress = new AtomicInteger();

    static ValidatedCalculationRateLimiter validatedCalculationRateLimiter() {
        var limit = new AbuseProtectionProperties.Limit(2, 4);
        return new ValidatedCalculationRateLimiter(
                new AbuseProtectionProperties(256, limit, limit, limit, limit),
                new ClientAddressResolver(true),
                new RequestRateLimiter(Clock.fixed(Instant.EPOCH, ZoneOffset.UTC)));
    }

    @Test
    void invalidRequestsDoNotSpendExecutionQuotaAndOneClientCannotConsumeItAll() throws Exception {
        when(optimization.optimize(any())).thenReturn(new OptimizationResponse(null, null));
        for (int i = 0; i < 20; i++) {
            String body = i % 2 == 0 ? "{}" : "{\"originalSlots\":";
            assertThat(post("/api/optimizer/drifs", body, "198.51.100.10").statusCode())
                    .isEqualTo(400);
            assertThat(post("/api/progression-path/plan", body, "198.51.100.10").statusCode())
                    .isEqualTo(400);
        }
        assertThat(post("/api/optimizer/drifs", VALID, "198.51.100.10").statusCode())
                .isEqualTo(200);
        assertThat(post("/api/optimizer/%64rifs", VALID, "198.51.100.10").statusCode())
                .isEqualTo(200);
        assertLimited(post("/api/optimizer/drifs", VALID, "198.51.100.10"));
        assertThat(post("/api/optimizer/drifs", VALID, "198.51.100.11").statusCode())
                .isEqualTo(200);
        assertThat(post("/api/optimizer/drifs", VALID, "198.51.100.11").statusCode())
                .isEqualTo(200);
        assertLimited(post("/api/optimizer/drifs", VALID, "198.51.100.12"));
        verify(optimization, times(4)).optimize(any());
    }

    private HttpResponse<String> post(String path, String body, String address) throws Exception {
        return client.send(
                HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path))
                        .timeout(Duration.ofSeconds(5))
                        .header("Content-Type", "application/json")
                        .header("X-Real-IP", address)
                        .header(
                                "X-Forwarded-For",
                                "203.0.113." + spoofedForwardedAddress.incrementAndGet())
                        .POST(HttpRequest.BodyPublishers.ofString(body))
                        .build(),
                HttpResponse.BodyHandlers.ofString());
    }

    private void assertLimited(HttpResponse<String> response) {
        assertThat(response.statusCode()).isEqualTo(429);
        assertThat(response.body()).contains("\"code\":\"RATE_LIMITED\"");
        assertThat(response.headers().firstValue("Retry-After")).contains("60");
        assertThat(response.headers().firstValue("X-Request-ID")).isPresent();
    }
}
