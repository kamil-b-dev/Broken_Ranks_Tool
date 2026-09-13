package pl.brokenranks.tool.broken_ranks_tool.core.ratelimit;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import pl.brokenranks.tool.broken_ranks_tool.core.config.SecurityConfig;
import pl.brokenranks.tool.broken_ranks_tool.core.web.filter.RequestTracingFilter;
import pl.brokenranks.tool.broken_ranks_tool.equipment.controller.CalculatorController;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.CalculationResultDto;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.EquipmentStatsCalculatorService;
import pl.brokenranks.tool.broken_ranks_tool.optimization.advisor.AdvisorRunRegistry;
import pl.brokenranks.tool.broken_ranks_tool.optimization.controller.AdvisorCancellationController;
import pl.brokenranks.tool.broken_ranks_tool.optimization.controller.OptimizationController;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationResponse;
import pl.brokenranks.tool.broken_ranks_tool.optimization.service.OptimizationExecutionGuard;

@WebMvcTest({
    OptimizationController.class,
    CalculatorController.class,
    AdvisorCancellationController.class
})
@Import({SecurityConfig.class, RequestTracingFilter.class, AbuseProtectionFilter.class})
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
@TestPropertySource(
        properties = {
            "abuse-protection.max-request-bytes=256",
            "abuse-protection.optimizer.client-requests-per-minute=2",
            "abuse-protection.optimizer.global-requests-per-minute=10",
            "abuse-protection.calculator.client-requests-per-minute=2",
            "abuse-protection.calculator.global-requests-per-minute=4",
            "abuse-protection.control.client-requests-per-minute=2",
            "abuse-protection.control.global-requests-per-minute=4",
            "abuse-protection.public-data.client-requests-per-minute=2",
            "abuse-protection.public-data.global-requests-per-minute=4"
        })
class AbuseProtectionFilterTests {

    private static final String VALID_REQUEST =
            """
            {
              "originalSlots": {"helmet": {"itemId": 1}},
              "priorities": {"DAMAGE_MAGIC": 10}
            }
            """;

    @Autowired private MockMvc mockMvc;

    @MockitoBean private OptimizationExecutionGuard executionGuard;

    @MockitoBean private EquipmentStatsCalculatorService calculatorService;

    @MockitoBean private AdvisorRunRegistry advisorRunRegistry;

    @Test
    void rejectsRequestsAboveTheConfiguredBodySize() throws Exception {
        mockMvc.perform(
                        post("/api/optimizer/drifs")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(new byte[257]))
                .andExpect(status().isPayloadTooLarge())
                .andExpect(jsonPath("$.code").value("REQUEST_TOO_LARGE"))
                .andExpect(jsonPath("$.requestId").isNotEmpty());

        verify(executionGuard, times(0)).optimize(any());
    }

    @Test
    void rejectsAnOversizedBodyWhenContentLengthIsUnknown() throws Exception {
        AbuseProtectionFilter filter = createFilter();
        HttpServletRequest request = unknownLengthRequest(new byte[257]);
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(request, response, chain);

        org.assertj.core.api.Assertions.assertThat(response.getStatus()).isEqualTo(413);
        org.assertj.core.api.Assertions.assertThat(response.getContentAsString())
                .contains("REQUEST_TOO_LARGE");
        verify(chain, never()).doFilter(any(), any());
    }

    @Test
    void replaysAnAllowedBodyWhenContentLengthIsUnknown() throws Exception {
        AbuseProtectionFilter filter = createFilter();
        byte[] body = "{\"priorities\":{}}".getBytes(StandardCharsets.UTF_8);
        HttpServletRequest request = unknownLengthRequest(body);
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicReference<byte[]> forwardedBody = new AtomicReference<>();
        FilterChain chain =
                (forwardedRequest, forwardedResponse) ->
                        forwardedBody.set(forwardedRequest.getInputStream().readAllBytes());

        filter.doFilter(request, response, chain);

        org.assertj.core.api.Assertions.assertThat(forwardedBody.get()).isEqualTo(body);
    }

    @Test
    void ignoresSpoofedForwardedForWhenLimitingOneClient() throws Exception {
        when(executionGuard.optimize(any(OptimizationRequest.class)))
                .thenReturn(new OptimizationResponse(null, null));

        for (int request = 0; request < 2; request++) {
            mockMvc.perform(
                            post("/api/optimizer/drifs")
                                    .header("X-Forwarded-For", "198.51.100." + request)
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(VALID_REQUEST))
                    .andExpect(status().isOk());
        }

        mockMvc.perform(
                        post("/api/optimizer/drifs")
                                .header("X-Forwarded-For", "203.0.113.77")
                                .header("X-Request-ID", "rate-limit-test")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(VALID_REQUEST))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andExpect(jsonPath("$.code").value("RATE_LIMITED"))
                .andExpect(jsonPath("$.requestId").value("rate-limit-test"));

        verify(executionGuard, times(2)).optimize(any());
    }

    @Test
    void rejectsOptimizationWhenTheWholeInstanceAllowanceIsExhausted() throws Exception {
        when(executionGuard.optimize(any(OptimizationRequest.class)))
                .thenReturn(new OptimizationResponse(null, null));

        for (int request = 0; request < 10; request++) {
            String clientAddress = "198.51.100." + request;
            mockMvc.perform(
                            post("/api/optimizer/drifs")
                                    .with(
                                            httpRequest -> {
                                                httpRequest.setRemoteAddr(clientAddress);
                                                return httpRequest;
                                            })
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(VALID_REQUEST))
                    .andExpect(status().isOk());
        }

        mockMvc.perform(
                        post("/api/optimizer/drifs")
                                .with(
                                        httpRequest -> {
                                            httpRequest.setRemoteAddr("203.0.113.1");
                                            return httpRequest;
                                        })
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(VALID_REQUEST))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andExpect(jsonPath("$.code").value("RATE_LIMITED"));

        verify(executionGuard, times(10)).optimize(any());
    }

    @Test
    void appliesASeparateHigherFrequencyPolicyToTheCalculator() throws Exception {
        when(calculatorService.calculateWithSources(any(EquipmentRequest.class)))
                .thenReturn(new CalculationResultDto(null, null, null));

        for (int request = 0; request < 2; request++) {
            mockMvc.perform(
                            post("/api/calculator/calculate")
                                    .header("X-Forwarded-For", "198.51.100.50")
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content("{}"))
                    .andExpect(status().isOk());
        }

        mockMvc.perform(
                        post("/api/calculator/calculate")
                                .header("X-Forwarded-For", "198.51.100.50")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{}"))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("RATE_LIMITED"));

        verify(calculatorService, times(2)).calculateWithSources(any());
    }

    @Test
    void rateLimitsAdvisorCancellationRequests() throws Exception {
        String path = "/api/optimizer/advisor/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/cancel";

        for (int request = 0; request < 2; request++) {
            mockMvc.perform(post(path)).andExpect(status().isOk());
        }

        mockMvc.perform(post(path))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("RATE_LIMITED"));

        verify(advisorRunRegistry, times(2)).cancel("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    }

    @Test
    void rateLimitsPublicApiReadsWithoutLimitingStaticRoutes() throws Exception {
        for (int request = 0; request < 2; request++) {
            mockMvc.perform(get("/api/missing")).andExpect(status().isNotFound());
        }

        mockMvc.perform(get("/api/missing"))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andExpect(jsonPath("$.code").value("RATE_LIMITED"));

        mockMvc.perform(get("/missing-page")).andExpect(status().isNotFound());
    }

    @Test
    void returnsUnsupportedMediaTypeWithoutTreatingItAsAServerFailure() throws Exception {
        mockMvc.perform(
                        post("/api/calculator/calculate")
                                .contentType(MediaType.TEXT_PLAIN)
                                .content("{}"))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.code").value("UNSUPPORTED_MEDIA_TYPE"));

        mockMvc.perform(get("/api/calculator/calculate"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.code").value("METHOD_NOT_ALLOWED"));
    }

    private AbuseProtectionFilter createFilter() {
        AbuseProtectionProperties.Limit limit = new AbuseProtectionProperties.Limit(2, 10);
        AbuseProtectionProperties properties =
                new AbuseProtectionProperties(256, limit, limit, limit, limit);
        return new AbuseProtectionFilter(properties, new RequestRateLimiter(), new ObjectMapper());
    }

    private HttpServletRequest unknownLengthRequest(byte[] content) {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/optimizer/drifs");
        request.setContentType(MediaType.APPLICATION_JSON_VALUE);
        request.setContent(content);
        return new HttpServletRequestWrapper(request) {
            @Override
            public int getContentLength() {
                return -1;
            }

            @Override
            public long getContentLengthLong() {
                return -1;
            }
        };
    }
}
