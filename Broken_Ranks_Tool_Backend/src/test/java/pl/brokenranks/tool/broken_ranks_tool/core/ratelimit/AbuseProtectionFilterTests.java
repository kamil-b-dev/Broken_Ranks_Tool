package pl.brokenranks.tool.broken_ranks_tool.core.ratelimit;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import pl.brokenranks.tool.broken_ranks_tool.core.config.RequestTracingFilter;
import pl.brokenranks.tool.broken_ranks_tool.core.config.SecurityConfig;
import pl.brokenranks.tool.broken_ranks_tool.equipment.controller.CalculatorController;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.CalculationResultDto;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.EquipmentStatsCalculatorService;
import pl.brokenranks.tool.broken_ranks_tool.optimization.controller.OptimizationController;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationResponse;
import pl.brokenranks.tool.broken_ranks_tool.optimization.service.OptimizationExecutionGuard;

@WebMvcTest({OptimizationController.class, CalculatorController.class})
@Import({SecurityConfig.class, RequestTracingFilter.class, AbuseProtectionFilter.class})
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
@TestPropertySource(
        properties = {
            "abuse-protection.max-request-bytes=256",
            "abuse-protection.optimizer.client-requests-per-minute=2",
            "abuse-protection.optimizer.global-requests-per-minute=10",
            "abuse-protection.calculator.client-requests-per-minute=2",
            "abuse-protection.calculator.global-requests-per-minute=4"
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

    @MockBean private OptimizationExecutionGuard executionGuard;

    @MockBean private EquipmentStatsCalculatorService calculatorService;

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
    void rejectsRepeatedOptimizationRequestsFromOneClient() throws Exception {
        when(executionGuard.optimize(any(OptimizationRequest.class)))
                .thenReturn(new OptimizationResponse(null, null));

        for (int request = 0; request < 2; request++) {
            mockMvc.perform(
                            post("/api/optimizer/drifs")
                                    .header("X-Forwarded-For", "198.51.100.25")
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(VALID_REQUEST))
                    .andExpect(status().isOk());
        }

        mockMvc.perform(
                        post("/api/optimizer/drifs")
                                .header("X-Forwarded-For", "198.51.100.25")
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
            mockMvc.perform(
                            post("/api/optimizer/drifs")
                                    .header("X-Forwarded-For", "198.51.100." + request)
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(VALID_REQUEST))
                    .andExpect(status().isOk());
        }

        mockMvc.perform(
                        post("/api/optimizer/drifs")
                                .header("X-Forwarded-For", "203.0.113.1")
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
}
