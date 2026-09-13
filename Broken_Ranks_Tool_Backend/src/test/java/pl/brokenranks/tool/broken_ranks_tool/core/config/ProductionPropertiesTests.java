package pl.brokenranks.tool.broken_ranks_tool.core.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;
import org.junit.jupiter.api.Test;

class ProductionPropertiesTests {

    @Test
    void keepsBundledCatalogueReadOnlyAndEmitsStructuredLogs() throws IOException {
        Properties properties = new Properties();
        try (InputStream input = getClass().getResourceAsStream("/application-prod.properties")) {
            assertThat(input).isNotNull();
            properties.load(input);
        }

        assertThat(properties.getProperty("spring.datasource.url")).contains("mode=ro");
        assertThat(properties.getProperty("logging.structured.format.console"))
                .isEqualTo("logstash");
    }
}
