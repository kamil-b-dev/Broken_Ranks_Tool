package pl.brokenranks.tool.broken_ranks_tool.equipment.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.CalculationResultDto;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.EquipmentStatsCalculatorService;

@WebMvcTest(CalculatorController.class)
class CalculatorControllerTests {

    @Autowired private MockMvc mockMvc;

    @MockBean private EquipmentStatsCalculatorService calculatorService;

    @Test
    void returnsCalculatedStatisticsAndSources() throws Exception {
        when(calculatorService.calculateWithSources(any(EquipmentRequest.class)))
                .thenReturn(
                        new CalculationResultDto(
                                Map.of("STRENGTH", "125"),
                                Map.of("CRITICAL_CHANCE", "OFFENSIVE"),
                                Set.of("ARMOR")));

        mockMvc.perform(
                        post("/api/calculator/calculate")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"slots\":{},\"characterStats\":{\"STRENGTH\":100}}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stats.STRENGTH").value("125"))
                .andExpect(jsonPath("$.drifCategories.CRITICAL_CHANCE").value("OFFENSIVE"))
                .andExpect(jsonPath("$.orbBonusTypes[0]").value("ARMOR"));

        verify(calculatorService).calculateWithSources(any(EquipmentRequest.class));
    }

    @Test
    void returnsStableBadRequestWhenCalculationIsInvalid() throws Exception {
        when(calculatorService.calculateWithSources(any(EquipmentRequest.class)))
                .thenThrow(new IllegalArgumentException("Niepoprawny ekwipunek."));

        mockMvc.perform(
                        post("/api/calculator/calculate")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"slots\":{}}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value("Niepoprawny ekwipunek."));
    }
}
