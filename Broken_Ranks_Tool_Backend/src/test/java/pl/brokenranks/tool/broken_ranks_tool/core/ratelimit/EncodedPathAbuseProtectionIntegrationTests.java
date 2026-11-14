package pl.brokenranks.tool.broken_ranks_tool.core.ratelimit;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.ByteArrayInputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.convention.TestBean;
import tools.jackson.databind.json.JsonMapper;

/** Exercises the container's decoded routing with actual encoded HTTP request targets. */
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
            "spring.datasource.url=jdbc:sqlite:file:database/catalog/broken_ranks.db?mode=ro",
            "abuse-protection.max-request-bytes=256"
        })
@ActiveProfiles("prod")
class EncodedPathAbuseProtectionIntegrationTests {
    private static final String RUN_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    private static final AtomicInteger CLIENT_SEQUENCE = new AtomicInteger();
    private static final byte[] OVERSIZED_BODY =
            (" ".repeat(256) + "{}").getBytes(StandardCharsets.UTF_8);

    @LocalServerPort private int port;

    @TestBean(enforceOverride = true)
    private AbuseProtectionFilter abuseProtectionFilter;

    private final HttpClient client =
            HttpClient.newBuilder()
                    .version(HttpClient.Version.HTTP_1_1)
                    .connectTimeout(Duration.ofSeconds(5))
                    .build();

    static AbuseProtectionFilter abuseProtectionFilter() {
        var limit = new AbuseProtectionProperties.Limit(2, 1000);
        var properties = new AbuseProtectionProperties(256, limit, limit, limit, limit);
        var limiter = new RequestRateLimiter(Clock.fixed(Instant.EPOCH, ZoneOffset.UTC));
        return new AbuseProtectionFilter(properties, limiter, new JsonMapper());
    }

    @ParameterizedTest
    @CsvSource({
        "/api/calculator/calculate, /api/calculator/%63alculate, 200",
        "/api/calculator/calculate, /%61pi/calculator/calculate, 200",
        "/api/optimizer/drifs, /api/optimizer/%64rifs, 400",
        "/api/optimizer/drifs, /%61pi/optimizer/drifs, 400",
        "/api/progression-path/plan, /api/progression-path/%70lan, 400",
        "/api/progression-path/plan, /%61pi/progression-path/plan, 400",
        "/api/optimizer/advisor/"
                + RUN_ID
                + "/cancel, /api/optimizer/advisor/"
                + RUN_ID
                + "/%63ancel, 200",
        "/api/optimizer/advisor/"
                + RUN_ID
                + "/cancel, /%61pi/optimizer/advisor/"
                + RUN_ID
                + "/cancel, 200"
    })
    void encodedPostsShareTheCanonicalEndpointRateLimit(
            String canonical, String encoded, int allowedStatus) throws Exception {
        String address = nextClient();
        assertThat(post(canonical, smallBody(canonical), address).statusCode())
                .isEqualTo(allowedStatus);
        assertThat(post(encoded, smallBody(encoded), address).statusCode())
                .isEqualTo(allowedStatus);

        assertRateLimited(post(encoded, smallBody(encoded), address));
        assertRateLimited(post(canonical, smallBody(canonical), address));
    }

    @ParameterizedTest
    @ValueSource(strings = {"/%61pi/missing", "/api/%6dissing"})
    void encodedPublicApiReadsShareTheirRateLimit(String encoded) throws Exception {
        String address = nextClient();
        assertThat(get("/api/missing", address).statusCode()).isEqualTo(404);
        assertThat(get(encoded, address).statusCode()).isEqualTo(404);

        assertRateLimited(get(encoded, address));
        assertRateLimited(get("/api/missing", address));
    }

    @ParameterizedTest
    @ValueSource(
            strings = {
                "/api/calculator/calculate",
                "/api/calculator/%63alculate",
                "/%61pi/calculator/calculate",
                "/api/optimizer/drifs",
                "/api/optimizer/%64rifs",
                "/%61pi/optimizer/drifs",
                "/api/progression-path/plan",
                "/api/progression-path/%70lan",
                "/%61pi/progression-path/plan",
                "/api/optimizer/advisor/" + RUN_ID + "/cancel",
                "/api/optimizer/advisor/" + RUN_ID + "/%63ancel",
                "/%61pi/optimizer/advisor/" + RUN_ID + "/cancel"
            })
    void rejectsOversizedBodiesWithDeclaredAndUnknownLength(String path) throws Exception {
        var declared = HttpRequest.BodyPublishers.ofByteArray(OVERSIZED_BODY);
        var chunked =
                HttpRequest.BodyPublishers.ofInputStream(
                        () -> new ByteArrayInputStream(OVERSIZED_BODY));
        assertThat(declared.contentLength()).isEqualTo(OVERSIZED_BODY.length);
        assertThat(chunked.contentLength()).isEqualTo(-1);

        for (var body : new HttpRequest.BodyPublisher[] {declared, chunked}) {
            var response = post(path, body, nextClient());
            assertThat(response.statusCode()).isEqualTo(413);
            assertThat(response.body()).contains("\"code\":\"REQUEST_TOO_LARGE\"");
        }
    }

    private HttpResponse<String> post(String path, HttpRequest.BodyPublisher body, String address)
            throws Exception {
        return client.send(
                request(path, address)
                        .header("Content-Type", "application/json")
                        .header(
                                "X-Advisor-Cancellation-Token",
                                "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")
                        .POST(body)
                        .build(),
                HttpResponse.BodyHandlers.ofString());
    }

    private HttpResponse<String> get(String path, String address) throws Exception {
        return client.send(
                request(path, address).GET().build(), HttpResponse.BodyHandlers.ofString());
    }

    private HttpRequest.Builder request(String path, String address) {
        return HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path))
                .timeout(Duration.ofSeconds(10))
                .header("X-Forwarded-For", address);
    }

    private static HttpRequest.BodyPublisher smallBody(String path) {
        return HttpRequest.BodyPublishers.ofString(
                path.contains("/advisor/") ? "null" : "{\"slots\":{}}");
    }

    private static String nextClient() {
        return "198.51.100." + CLIENT_SEQUENCE.incrementAndGet();
    }

    private static void assertRateLimited(HttpResponse<String> response) {
        assertThat(response.statusCode()).isEqualTo(429);
        assertThat(response.body()).contains("\"code\":\"RATE_LIMITED\"");
        assertThat(response.headers().firstValue("Retry-After")).isPresent();
    }
}
