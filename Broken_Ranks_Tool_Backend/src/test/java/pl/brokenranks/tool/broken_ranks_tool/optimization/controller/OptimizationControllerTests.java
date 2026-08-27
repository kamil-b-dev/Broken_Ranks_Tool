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
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationResponse;
import pl.brokenranks.tool.broken_ranks_tool.optimization.service.ModsOptimizationService;

@WebMvcTest(OptimizationController.class)
class OptimizationControllerTests {

    @Autowired private MockMvc mockMvc;

    @MockBean private ModsOptimizationService optimizationService;

    @Test
    void delegatesOptimizationAndReturnsItsContract() throws Exception {
        when(optimizationService.optimize(any(OptimizationRequest.class)))
                .thenReturn(new OptimizationResponse(null, null));

        mockMvc.perform(
                        post("/api/optimizer/drifs")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.optimizedSetup").doesNotExist())
                .andExpect(jsonPath("$.summary").doesNotExist());

        verify(optimizationService).optimize(any(OptimizationRequest.class));
    }
}
