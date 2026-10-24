package pl.brokenranks.tool.broken_ranks_tool.core.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties =
                "spring.datasource.url=jdbc:sqlite:file:database/catalog/broken_ranks.db?mode=ro")
@ActiveProfiles("prod")
class TomcatLocaleIntegrationTests {

    @LocalServerPort private int port;

    private final HttpClient httpClient =
            HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    @ParameterizedTest
    @ValueSource(
            strings = {
                "pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7",
                "pl,en,de,fr,es,it,pt,nl,sv,da,fi,cs",
                "pl,en,de,fr,es,it,pt,nl,sv,da,fi,cs,sk,sl,hr,ro,hu,el,tr,uk,bg,lt,lv,et,no,is,ga,mt,sq,mk,ru,ar"
            })
    void acceptsBrowserLanguageListsUpToTheConfiguredLimit(String acceptLanguage) throws Exception {
        HttpRequest request =
                HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/actuator/health"))
                        .timeout(Duration.ofSeconds(10))
                        .header("Accept-Language", acceptLanguage)
                        .GET()
                        .build();

        HttpResponse<String> response =
                httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.body()).contains("\"status\":\"UP\"");
    }
}
