package pl.brokenranks.tool.broken_ranks_tool.core.config;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import pl.brokenranks.tool.broken_ranks_tool.app_data.controller.InitialDataController;
import pl.brokenranks.tool.broken_ranks_tool.app_data.service.InitialDataService;
import pl.brokenranks.tool.broken_ranks_tool.optimization.advisor.AdvisorRunRegistry;
import pl.brokenranks.tool.broken_ranks_tool.optimization.controller.AdvisorCancellationController;

@WebMvcTest({InitialDataController.class, AdvisorCancellationController.class})
@Import({SecurityConfig.class, RequestTracingFilter.class})
class SecurityConfigTests {

    @Autowired private MockMvc mockMvc;

    @MockBean private InitialDataService initialDataService;

    @MockBean private AdvisorRunRegistry advisorRunRegistry;

    @Test
    void permitsPublicGetRequestsAndAddsSecurityHeaders() throws Exception {
        mockMvc.perform(get("/api/initial-data"))
                .andExpect(status().isOk())
                .andExpect(header().exists("Content-Security-Policy"))
                .andExpect(header().string("X-Frame-Options", "DENY"));
    }

    @Test
    void rejectsUndeclaredWriteEndpointsWithStandardError() throws Exception {
        mockMvc.perform(post("/api/undeclared").header("X-Request-ID", "security-test"))
                .andExpect(status().isForbidden())
                .andExpect(header().string("X-Request-ID", "security-test"))
                .andExpect(jsonPath("$.code").value("FORBIDDEN"))
                .andExpect(jsonPath("$.requestId").value("security-test"));
    }

    @Test
    void permitsTheDeclaredAdvisorCancellationEndpoint() throws Exception {
        when(advisorRunRegistry.cancel("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")).thenReturn(true);

        mockMvc.perform(post("/api/optimizer/advisor/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/cancel"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cancelled").value(true));
    }

    @Test
    void keepsActuatorMetricsPrivate() throws Exception {
        mockMvc.perform(get("/actuator/metrics"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }
}
