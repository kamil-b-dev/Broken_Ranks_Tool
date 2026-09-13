package pl.brokenranks.tool.broken_ranks_tool.core.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.stereotype.Controller;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = StaticResourceConfigTests.NoopController.class)
@Import({SecurityConfig.class, StaticResourceConfig.class})
class StaticResourceConfigTests {

    @Controller
    static class NoopController {}

    @Autowired private MockMvc mockMvc;

    @Test
    void cachesContentHashedAssetsForOneYear() throws Exception {
        mockMvc.perform(get("/assets/cache-test-123.js"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("text/javascript"))
                .andExpect(header().string("Cache-Control", "max-age=31536000, public, immutable"));
    }
}
