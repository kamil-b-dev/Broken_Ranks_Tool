package pl.brokenranks.tool.broken_ranks_tool.core.ratelimit;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.web.MockHttpServletRequest;

class ClientAddressResolverTests {
    @Test
    void ignoresClientHeadersUnlessTheDeploymentExplicitlyTrustsTheEdge() {
        var request = request("198.51.100.5");
        assertThat(new ClientAddressResolver(false).resolve(request)).isEqualTo("192.0.2.10");
    }

    @Test
    void resolvesOnlyRailwaysSingleIpAndNormalizesEquivalentAddresses() {
        var resolver = new ClientAddressResolver(true);
        assertThat(resolver.resolve(request("198.51.100.5"))).isEqualTo("198.51.100.5");
        assertThat(resolver.resolve(request("::ffff:198.51.100.5"))).isEqualTo("198.51.100.5");
        var duplicate = request("198.51.100.5");
        duplicate.addHeader("X-Real-IP", "198.51.100.6");
        assertThat(resolver.resolve(duplicate)).isEqualTo("192.0.2.10");
    }

    @ParameterizedTest
    @ValueSource(
            strings = {
                "",
                "localhost",
                "attacker.invalid",
                "127.1",
                "999.2.3.4",
                "198.51.100.5,198.51.100.6",
                "198.51.100.5:8080",
                "fe80::1%eth0",
                "[::1]"
            })
    void fallsBackToTheTransportAddressForInvalidOrAmbiguousHeaders(String header) {
        assertThat(new ClientAddressResolver(true).resolve(request(header)))
                .isEqualTo("192.0.2.10");
    }

    @ParameterizedTest
    @ValueSource(
            strings = {
                "127.0.0.1",
                "10.0.0.1",
                "172.16.0.1",
                "192.168.1.1",
                "169.254.1.1",
                "100.64.0.1",
                "100.127.255.255",
                "fc00::1",
                "fe80::1",
                "::1"
            })
    void unidentifiedIntermediariesDoNotShareOneIndividualUploadAllowance(String peer) {
        var request = request("198.51.100.5");
        request.setRemoteAddr(peer);
        assertThat(new ClientAddressResolver(false).individualClient(request)).isNull();
        assertThat(new ClientAddressResolver(true).individualClient(request))
                .isEqualTo("198.51.100.5");
    }

    @Test
    void directPublicClientsHaveAnIndividualUploadAllowance() {
        var request = request("198.51.100.5");
        request.setRemoteAddr("203.0.113.10");
        assertThat(new ClientAddressResolver(false).individualClient(request))
                .isEqualTo("203.0.113.10");
    }

    private MockHttpServletRequest request(String realIp) {
        var request = new MockHttpServletRequest();
        request.setRemoteAddr("192.0.2.10");
        request.addHeader("X-Real-IP", realIp);
        request.addHeader("X-Forwarded-For", "203.0.113.50");
        return request;
    }
}
