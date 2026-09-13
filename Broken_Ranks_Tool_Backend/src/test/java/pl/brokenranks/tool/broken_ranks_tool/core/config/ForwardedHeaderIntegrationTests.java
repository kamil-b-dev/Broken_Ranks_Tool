package pl.brokenranks.tool.broken_ranks_tool.core.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
            "spring.datasource.url=jdbc:sqlite:database/catalog/broken_ranks.db",
            "abuse-protection.optimizer.client-requests-per-minute=2",
            "abuse-protection.optimizer.global-requests-per-minute=10"
        })
@ActiveProfiles("prod")
class ForwardedHeaderIntegrationTests {

    @LocalServerPort private int port;

    @Value("${server.tomcat.remoteip.internal-proxies}")
    private String trustedProxyRegex;

    private final HttpClient httpClient =
            HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    @Test
    void trustsTheDirectProxyButIgnoresAClientSpoofedAddress() throws Exception {
        assertThat(postFrom("203.0.113.1, 198.51.100.10")).isEqualTo(400);
        assertThat(postFrom("192.0.2.1, 198.51.100.10")).isEqualTo(400);
        assertThat(postFrom("203.0.113.2, 198.51.100.10")).isEqualTo(429);

        assertThat(postFrom("198.51.100.11")).isEqualTo(400);
    }

    @Test
    void limitsTheDefaultProxyTrustToPrivateAndCarrierGradeNatNetworks() {
        Pattern trustedProxies = Pattern.compile(trustedProxyRegex);

        assertThat(trustedProxies.matcher("10.12.34.56").matches()).isTrue();
        assertThat(trustedProxies.matcher("172.31.255.255").matches()).isTrue();
        assertThat(trustedProxies.matcher("100.64.0.1").matches()).isTrue();
        assertThat(trustedProxies.matcher("100.127.255.254").matches()).isTrue();
        assertThat(trustedProxies.matcher("fd12:3456:789a::1").matches()).isTrue();

        assertThat(trustedProxies.matcher("100.63.255.255").matches()).isFalse();
        assertThat(trustedProxies.matcher("100.128.0.1").matches()).isFalse();
        assertThat(trustedProxies.matcher("203.0.113.10").matches()).isFalse();
    }

    private int postFrom(String forwardedFor) throws Exception {
        HttpRequest request =
                HttpRequest.newBuilder(
                                URI.create("http://127.0.0.1:" + port + "/api/optimizer/drifs"))
                        .timeout(Duration.ofSeconds(5))
                        .header("Content-Type", "application/json")
                        .header("X-Forwarded-For", forwardedFor)
                        .POST(HttpRequest.BodyPublishers.ofString("{}"))
                        .build();
        return httpClient.send(request, HttpResponse.BodyHandlers.discarding()).statusCode();
    }
}
