package pl.brokenranks.tool.broken_ranks_tool.core.ratelimit;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.net.Socket;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
            "spring.datasource.url=jdbc:sqlite:file:database/catalog/broken_ranks.db?mode=ro",
            "server.tomcat.threads.max=2",
            "server.tomcat.threads.min-spare=2",
            "server.tomcat.connection-timeout=5s",
            "abuse-protection.body.timeout=2s",
            "abuse-protection.body.max-pending-requests=3",
            "abuse-protection.max-request-bytes=256",
            "abuse-protection.trust-railway-client-ip=true"
        })
@ActiveProfiles("prod")
class RequestBodyProtectionIntegrationTests {
    @LocalServerPort private int port;
    private final HttpClient client = HttpClient.newHttpClient();

    @ParameterizedTest
    @ValueSource(strings = {"POST", "GET"})
    void slowBodiesDoNotOccupyWorkersAndExpireDespiteContinuousTraffic(String method)
            throws Exception {
        assertReadiness();
        try (var first = new SlowClient(method);
                var second = new SlowClient(method)) {
            assertReadiness();
            assertThat(calculate().statusCode()).isEqualTo(200);
            String response = first.response();
            assertThat(response)
                    .contains(
                            " 408 ",
                            "\"code\":\"REQUEST_TIMEOUT\"",
                            "\"requestId\":\"slow-body-test\"");
            assertThat(second.response()).contains(" 408 ", "\"code\":\"REQUEST_TIMEOUT\"");
        }
        assertReadiness();
    }

    @Test
    void pendingBodyLimitRejectsImmediatelyAndReleasesDisconnectedClients() throws Exception {
        assertReadiness();
        var slow = new ArrayList<SlowClient>();
        try {
            for (int i = 0; i < 3; i++) slow.add(new SlowClient("POST"));
            Thread.sleep(150);
            try (var rejected = new SlowClient("POST")) {
                assertThat(rejected.response()).contains(" 429 ", "\"code\":\"RATE_LIMITED\"");
            }
            assertReadiness();
        } finally {
            for (var connection : slow) connection.close();
        }
        HttpResponse<String> recovered = null;
        for (int i = 0; i < 40; i++) {
            recovered = calculate();
            if (recovered.statusCode() == 200) break;
            Thread.sleep(25);
        }
        assertThat(recovered.statusCode()).isEqualTo(200);
    }

    @Test
    void oneKnownClientCannotFillTheGlobalPendingBodyAllowance() throws Exception {
        assertReadiness();
        try (var first = new SlowClient("POST", "198.51.100.30");
                var second = new SlowClient("POST", "198.51.100.30")) {
            Thread.sleep(150);
            try (var rejected = new SlowClient("POST", "198.51.100.30")) {
                assertThat(rejected.response()).contains(" 429 ", "\"code\":\"RATE_LIMITED\"");
            }
            var other =
                    client.send(
                            HttpRequest.newBuilder(uri("/api/calculator/calculate"))
                                    .timeout(Duration.ofSeconds(1))
                                    .header("Content-Type", "application/json")
                                    .header("X-Real-IP", "198.51.100.31")
                                    .POST(HttpRequest.BodyPublishers.ofString("{\"slots\":{}}"))
                                    .build(),
                            HttpResponse.BodyHandlers.ofString());
            assertThat(other.statusCode()).isEqualTo(200);
            assertReadiness();
        }
    }

    private void assertReadiness() throws Exception {
        var response =
                client.send(
                        HttpRequest.newBuilder(uri("/actuator/health/readiness"))
                                .timeout(Duration.ofSeconds(1))
                                .GET()
                                .build(),
                        HttpResponse.BodyHandlers.ofString());
        assertThat(response.statusCode()).isEqualTo(200);
    }

    private HttpResponse<String> calculate() throws Exception {
        return client.send(
                HttpRequest.newBuilder(uri("/api/calculator/calculate"))
                        .timeout(Duration.ofSeconds(1))
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString("{\"slots\":{}}"))
                        .build(),
                HttpResponse.BodyHandlers.ofString());
    }

    private URI uri(String path) {
        return URI.create("http://127.0.0.1:" + port + path);
    }

    private final class SlowClient implements AutoCloseable {
        private final Socket socket;
        private final ScheduledExecutorService sender =
                Executors.newSingleThreadScheduledExecutor();

        private SlowClient(String method) throws IOException {
            this(method, null);
        }

        private SlowClient(String method, String address) throws IOException {
            socket = new Socket("127.0.0.1", port);
            socket.setSoTimeout(5000);
            String path =
                    method.equals("GET")
                            ? "/actuator/health/readiness"
                            : "/api/calculator/calculate";
            socket.getOutputStream()
                    .write(
                            (method
                                            + " "
                                            + path
                                            + " HTTP/1.1\r\nHost: localhost\r\n"
                                            + "Content-Type: application/json\r\nContent-Length: 200\r\n"
                                            + (address == null
                                                    ? ""
                                                    : "X-Real-IP: " + address + "\r\n")
                                            + "X-Request-ID: slow-body-test\r\nConnection: close\r\n\r\n{")
                                    .getBytes(StandardCharsets.US_ASCII));
            socket.getOutputStream().flush();
            sender.scheduleAtFixedRate(
                    () -> {
                        try {
                            socket.getOutputStream().write(' ');
                            socket.getOutputStream().flush();
                        } catch (IOException ignored) {
                            sender.shutdown();
                        }
                    },
                    50,
                    50,
                    TimeUnit.MILLISECONDS);
        }

        private String response() throws IOException {
            return new String(socket.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        }

        @Override
        public void close() throws IOException {
            sender.shutdownNow();
            socket.close();
        }
    }
}
