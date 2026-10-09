package pl.brokenranks.tool.broken_ranks_tool.core.config;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import pl.brokenranks.tool.broken_ranks_tool.catalog.controller.InitialDataController;
import pl.brokenranks.tool.broken_ranks_tool.catalog.service.InitialDataService;
import pl.brokenranks.tool.broken_ranks_tool.core.web.filter.RequestTracingFilter;
import pl.brokenranks.tool.broken_ranks_tool.optimization.advisor.AdvisorRunRegistry;
import pl.brokenranks.tool.broken_ranks_tool.optimization.controller.AdvisorCancellationController;

@WebMvcTest({InitialDataController.class, AdvisorCancellationController.class})
@Import({SecurityConfig.class, RequestTracingFilter.class})
class SecurityConfigTests {

    @Autowired private MockMvc mockMvc;

    @MockitoBean private InitialDataService initialDataService;

    @MockitoBean private AdvisorRunRegistry advisorRunRegistry;

    @Test
    void permitsPublicGetRequestsAndAddsSecurityHeaders() throws Exception {
        mockMvc.perform(get("/api/initial-data"))
                .andExpect(status().isOk())
                .andExpect(
                        header().string(
                                        "Content-Security-Policy",
                                        org.hamcrest.Matchers.containsString(
                                                "style-src-elem 'self'; style-src-attr 'unsafe-inline'")))
                .andExpect(header().string("X-Frame-Options", "DENY"))
                .andExpect(header().exists("Strict-Transport-Security"))
                .andExpect(header().string("Cache-Control", "max-age=3600, public"));
    }

    @Test
    void returnsANotFoundResponseWithoutTreatingUnknownApiPathsAsServerFailures() throws Exception {
        mockMvc.perform(get("/api/missing"))
                .andExpect(status().isNotFound())
                .andExpect(
                        header().string(
                                        "Cache-Control",
                                        "no-cache, no-store, max-age=0, must-revalidate"))
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
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
        when(advisorRunRegistry.cancel(
                        "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
                        "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"))
                .thenReturn(true);

        mockMvc.perform(
                        post("/api/optimizer/advisor/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/cancel")
                                .header(
                                        "X-Advisor-Cancellation-Token",
                                        "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cancelled").value(true));
    }

    @Test
    void refusesAdvisorCancellationWithoutItsIndependentToken() throws Exception {
        mockMvc.perform(post("/api/optimizer/advisor/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/cancel"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void keepsActuatorMetricsPrivate() throws Exception {
        mockMvc.perform(get("/actuator/metrics"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }
}
