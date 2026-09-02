package pl.brokenranks.tool.broken_ranks_tool.optimization.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import pl.brokenranks.tool.broken_ranks_tool.core.config.SecurityConfig;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationResponse;
import pl.brokenranks.tool.broken_ranks_tool.optimization.service.OptimizationExecutionGuard;

@WebMvcTest(OptimizationController.class)
@Import(SecurityConfig.class)
class OptimizationControllerTests {

    @Autowired private MockMvc mockMvc;

    @MockBean private OptimizationExecutionGuard executionGuard;

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
}
