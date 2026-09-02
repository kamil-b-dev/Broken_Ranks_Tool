package pl.brokenranks.tool.broken_ranks_tool.app_data.controller;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import pl.brokenranks.tool.broken_ranks_tool.app_data.dto.DictionariesDto;
import pl.brokenranks.tool.broken_ranks_tool.app_data.dto.GameRulesDto;
import pl.brokenranks.tool.broken_ranks_tool.app_data.dto.InitialDataDto;
import pl.brokenranks.tool.broken_ranks_tool.app_data.service.InitialDataService;
import pl.brokenranks.tool.broken_ranks_tool.core.config.SecurityConfig;

@WebMvcTest(InitialDataController.class)
@Import(SecurityConfig.class)
class InitialDataControllerTests {

    @Autowired private MockMvc mockMvc;

    @MockBean private InitialDataService initialDataService;

    @Test
    void returnsFrontendStartupContract() throws Exception {
        GameRulesDto gameRules =
                new GameRulesDto(
                        Map.of(), Map.of(), Map.of(), Map.of(), Map.of(), Map.of(), Map.of(1, 1.0));
        DictionariesDto dictionaries =
                new DictionariesDto(Map.of("HELMET", "Hełm"), Map.of(), Map.of());
        when(initialDataService.getInitialData())
                .thenReturn(
                        new InitialDataDto(
                                List.of(), List.of(), List.of(), gameRules, dictionaries));

        mockMvc.perform(get("/api/initial-data"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isArray())
                .andExpect(jsonPath("$.orbs").isArray())
                .andExpect(jsonPath("$.drifs").isArray())
                .andExpect(jsonPath("$.gameRules.drifPenaltyMultipliers.1").value(1.0))
                .andExpect(jsonPath("$.dictionaries.itemCategories.HELMET").value("Hełm"));

        verify(initialDataService).getInitialData();
    }
}
