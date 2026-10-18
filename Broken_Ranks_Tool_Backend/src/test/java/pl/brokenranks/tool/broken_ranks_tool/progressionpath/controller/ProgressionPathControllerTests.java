package pl.brokenranks.tool.broken_ranks_tool.progressionpath.controller;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import pl.brokenranks.tool.broken_ranks_tool.core.config.*;
import pl.brokenranks.tool.broken_ranks_tool.core.execution.HeavyCalculationGate;
import pl.brokenranks.tool.broken_ranks_tool.progressionpath.dto.ProgressionPlanResponse;
import pl.brokenranks.tool.broken_ranks_tool.progressionpath.dto.ProgressionTargetRequest;
import pl.brokenranks.tool.broken_ranks_tool.progressionpath.service.ProgressionTargetPlanningService;

@WebMvcTest(ProgressionPathController.class)
@Import({SecurityConfig.class, ApiJsonConfig.class, HeavyCalculationGate.class})
@TestPropertySource(
        properties = {
            "abuse-protection.optimizer.client-requests-per-minute=1000",
            "abuse-protection.optimizer.global-requests-per-minute=1000"
        })
class ProgressionPathControllerTests {
    private static final String INPUT =
            """
        {"characterClass":"ARCHER","targetLevel":140,"targetEquipment":{"slots":{}},"resSlots":[]}
        """;
    @Autowired private MockMvc mvc;
    @Autowired private HeavyCalculationGate gate;
    @MockitoBean private ProgressionTargetPlanningService service;

    @Test
    void exposesASeparatePublicEndpointAndReleasesTheSharedWorker() throws Exception {
        when(service.plan(any()))
                .thenReturn(
                        new ProgressionPlanResponse(
                                "NO_PATH_FOUND",
                                List.of(),
                                List.of(),
                                List.of(),
                                new ProgressionPlanResponse.SearchReport(
                                        "SEARCH_COMPLETED", 0, 6, 0, false)));
        mvc.perform(
                        post("/api/progression-path/plan")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(INPUT))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.outcome").value("NO_PATH_FOUND"))
                .andExpect(jsonPath("$.searchReport.proofComplete").value(false));
        assertTrue(gate.tryAcquire());
        gate.release();
    }

    @Test
    void readsExplicitDefaultOptionsAndAnEmptyReservedSlot() throws Exception {
        String input =
                """
            {
              "characterClass": "FIRE_MAGE",
              "targetLevel": 140,
              "targetEquipment": {
                "slots": {
                  "ring1": {
                    "itemId": null,
                    "orbIds": [], "orbLevels": [],
                    "drifIds": [], "drifLevels": {}
                  }
                },
                "characterStats": {"Moc": 135, "Siła": 10}
              },
              "resSlots": ["ring1"],
              "balanceStats": false,
              "minItemLevelGap": 0
            }
            """;
        mvc.perform(
                        post("/api/progression-path/plan")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(input))
                .andExpect(status().isOk());
        var argument = ArgumentCaptor.forClass(ProgressionTargetRequest.class);
        verify(service).plan(argument.capture());
        var request = argument.getValue();
        assertEquals(Set.of("ring1"), request.resSlots());
        assertFalse(request.balanceStats());
        assertEquals(0, request.minItemLevelGap());
        assertNull(request.targetEquipment().getSlots().get("ring1").getItemId());
        assertEquals(135, request.targetEquipment().getCharacterStats().get("Moc"));
        assertTrue(gate.tryAcquire());
        gate.release();
    }

    @Test
    void invalidInputsNeverReachTheWorkerAndStrictJsonContractIsRetained() throws Exception {
        for (String input :
                List.of(
                        "{}",
                        INPUT.replace("\"ARCHER\"", "\"unknown\""),
                        INPUT.replace("\"slots\":{}", "\"slots\":{},\"extra\":true"),
                        INPUT.replace(
                                "\"targetLevel\":140", "\"targetLevel\":140,\"targetLevel\":2"),
                        INPUT.replace("\"resSlots\":[]", "\"resSlots\":[\"weapon\"]"),
                        INPUT.replace("\"targetLevel\":140", "\"targetLevel\":141"),
                        INPUT.replace("\"resSlots\":[]", "\"resSlots\":[],\"minItemLevelGap\":-1"),
                        INPUT.replace(
                                "\"resSlots\":[]", "\"resSlots\":[],\"minItemLevelGap\":141"))) {
            mvc.perform(
                            post("/api/progression-path/plan")
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(input))
                    .andExpect(status().isBadRequest());
        }
        verifyNoInteractions(service);
    }

    @Test
    void rejectsOverlapAndReleasesTheWorkerAfterFailure() throws Exception {
        assertTrue(gate.tryAcquire());
        try {
            mvc.perform(
                            post("/api/progression-path/plan")
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(INPUT))
                    .andExpect(status().isTooManyRequests());
        } finally {
            gate.release();
        }
        when(service.plan(any())).thenThrow(new IllegalArgumentException("Błędny etap."));
        mvc.perform(
                        post("/api/progression-path/plan")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(INPUT))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Błędny etap."));
        assertTrue(gate.tryAcquire());
        gate.release();
    }
}
