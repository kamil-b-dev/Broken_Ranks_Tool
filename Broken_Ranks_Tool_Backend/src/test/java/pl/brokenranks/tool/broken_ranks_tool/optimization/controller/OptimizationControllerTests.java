package pl.brokenranks.tool.broken_ranks_tool.optimization.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import pl.brokenranks.tool.broken_ranks_tool.core.config.SecurityConfig;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationResponse;
import pl.brokenranks.tool.broken_ranks_tool.optimization.service.OptimizationExecutionGuard;
import pl.brokenranks.tool.broken_ranks_tool.optimization.service.OptimizerMemoryPressureException;

@WebMvcTest(
        value = OptimizationController.class,
        properties = {
            "abuse-protection.optimizer.client-requests-per-minute=100",
            "abuse-protection.optimizer.global-requests-per-minute=100"
        })
@Import(SecurityConfig.class)
class OptimizationControllerTests {

    @Autowired private MockMvc mockMvc;

    @MockitoBean private OptimizationExecutionGuard executionGuard;

    @Test
    void rejectsDuplicateOccurrencesBeforeAcquiringTheWorker() throws Exception {
        mockMvc.perform(
                        post("/api/optimizer/drifs")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                {"originalSlots":{"helmet":{"itemId":1}},"backpackOnly":true,
                "backpackDrifs":[{"id":"same","templateId":1,"level":1},{"id":"same","templateId":1,"level":2}]}
                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
        verifyNoInteractions(executionGuard);
    }

    @ParameterizedTest
    @ValueSource(
            strings = {
                "\"backpackOnly\":true,\"backpackDrifs\":null",
                "\"backpackOnly\":true,\"configurationMode\":\"SIMPLE\",\"backpackDrifs\":[]",
                "\"backpackOnly\":true,\"mode\":\"ADVISOR\",\"backpackDrifs\":[]",
                "\"backpackOnly\":true,\"generateVariants\":true,\"backpackDrifs\":[]",
                "\"backpackDrifs\":[{\"id\":\"one\",\"templateId\":1,\"level\":1}]",
                "\"backpackOnly\":true,\"backpackDrifs\":[null]",
                "\"backpackOnly\":true,\"backpackDrifs\":[{\"id\":\"\",\"templateId\":1,\"level\":1}]",
                "\"backpackOnly\":true,\"backpackDrifs\":[{\"id\":\"one\",\"templateId\":0,\"level\":1}]",
                "\"backpackOnly\":true,\"backpackDrifs\":[{\"id\":\"one\",\"templateId\":1,\"level\":22}]"
            })
    void rejectsInvalidBackpackRequestsBeforeAcquiringTheWorker(String fields) throws Exception {
        mockMvc.perform(
                        post("/api/optimizer/drifs")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"originalSlots\":{\"helmet\":{\"itemId\":1}},"
                                                + fields
                                                + "}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
        verifyNoInteractions(executionGuard);
    }

    @Test
    void rejects201BackpackDrifsBeforeTheExecutionGuard() throws Exception {
        String entries =
                java.util.stream.IntStream.range(0, 201)
                        .mapToObj(i -> "{\"id\":\"stone-" + i + "\",\"templateId\":1,\"level\":1}")
                        .collect(java.util.stream.Collectors.joining(","));
        mockMvc.perform(
                        post("/api/optimizer/drifs")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"originalSlots\":{\"helmet\":{\"itemId\":1}},\"backpackOnly\":true,\"backpackDrifs\":["
                                                + entries
                                                + "]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
                .andExpect(
                        jsonPath("$.message").value(org.hamcrest.Matchers.containsString("200")));
        verifyNoInteractions(executionGuard);
    }

    @Test
    void accepts200BackpackDrifsAtTheHttpBoundary() throws Exception {
        when(executionGuard.optimize(any())).thenReturn(new OptimizationResponse(null, null));
        String entries =
                java.util.stream.IntStream.range(0, 200)
                        .mapToObj(i -> "{\"id\":\"stone-" + i + "\",\"templateId\":1,\"level\":1}")
                        .collect(java.util.stream.Collectors.joining(","));
        mockMvc.perform(
                        post("/api/optimizer/drifs")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"originalSlots\":{\"helmet\":{\"itemId\":1}},\"backpackOnly\":true,\"backpackDrifs\":["
                                                + entries
                                                + "]}"))
                .andExpect(status().isOk());
        verify(executionGuard).optimize(any());
    }

    @Test
    void returnsAnExpectedServiceUnavailableResponseForMemoryPressure() throws Exception {
        when(executionGuard.optimize(any())).thenThrow(new OptimizerMemoryPressureException());
        mockMvc.perform(
                        post("/api/optimizer/drifs")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        "{\"originalSlots\":{\"helmet\":{\"itemId\":1}},\"priorities\":{\"DAMAGE_MAGIC\":10}}"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("OPTIMIZER_MEMORY_PRESSURE"))
                .andExpect(
                        jsonPath("$.message")
                                .value(new OptimizerMemoryPressureException().getMessage()))
                .andExpect(jsonPath("$.requestId").isNotEmpty());
    }

    @Test
    void delegatesOptimizationAndReturnsItsContract() throws Exception {
        when(executionGuard.optimize(any(OptimizationRequest.class)))
                .thenReturn(new OptimizationResponse(null, null));

        mockMvc.perform(
                        post("/api/optimizer/drifs")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "originalSlots": {"helmet": {"itemId": 1}},
                                          "priorities": {"DAMAGE_MAGIC": 10}
                                        }
                                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.optimizedSetup").doesNotExist())
                .andExpect(jsonPath("$.summary").doesNotExist());

        verify(executionGuard).optimize(any(OptimizationRequest.class));
    }

    @Test
    void rejectsAnInvalidContractBeforeStartingOptimization() throws Exception {
        mockMvc.perform(
                        post("/api/optimizer/drifs")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
    }

    @Test
    void rejectsANonUuidAdvisorRunIdBeforeStartingOptimization() throws Exception {
        mockMvc.perform(
                        post("/api/optimizer/drifs")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {
                                          "mode": "ADVISOR",
                                          "advisor": {
                                            "goal": "DAMAGE_MAGIC",
                                            "runId": "predictable-id"
                                          },
                                          "originalSlots": {"helmet": {"itemId": 1}},
                                          "priorities": {"DAMAGE_MAGIC": 10}
                                        }
                                        """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("MALFORMED_JSON"));

        verifyNoInteractions(executionGuard);
    }
}
