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
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import pl.brokenranks.tool.broken_ranks_tool.core.config.SecurityConfig;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
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

    @ParameterizedTest
    @ValueSource(strings = {"0", "51", "null"})
    void rejectsMoveLimitsOutsideThePlayerRangeBeforeAcquiringTheWorker(String limit)
            throws Exception {
        mockMvc.perform(
                        post("/api/optimizer/drifs")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                {"mode":"REORGANIZE","originalSlots":{"helmet":{"itemId":1}},
                 "reorganization":{"task":"UPGRADE","maxMoves":%s}}
                """
                                                .formatted(limit)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
        verifyNoInteractions(executionGuard);
    }

    @ParameterizedTest
    @ValueSource(ints = {1, 50})
    void acceptsMoveLimitsAtBothEndsOfThePlayerRange(int limit) throws Exception {
        when(executionGuard.optimize(any())).thenReturn(new OptimizationResponse(null, null));
        mockMvc.perform(
                        post("/api/optimizer/drifs")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                {"mode":"REORGANIZE","originalSlots":{"helmet":{"itemId":1}},
                 "reorganization":{"task":"UPGRADE","maxMoves":%d}}
                """
                                                .formatted(limit)))
                .andExpect(status().isOk());
        var captured = ArgumentCaptor.forClass(OptimizationRequest.class);
        verify(executionGuard).optimize(captured.capture());
        org.junit.jupiter.api.Assertions.assertEquals(
                limit, captured.getValue().getReorganization().getMaxMoves());
    }

    @ParameterizedTest
    @ValueSource(strings = {"UPGRADE", "RESERVE"})
    void rejectsBackpackSupplyInEquippedOnlyTasksBeforeAcquiringTheWorker(String task)
            throws Exception {
        mockMvc.perform(
                        post("/api/optimizer/drifs")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                {"mode":"REORGANIZE","originalSlots":{"helmet":{"itemId":1}},
                 "reorganization":{"task":"%s"},
                 "backpackDrifs":[{"id":"other","templateId":12,"level":6}]}
                """
                                                .formatted(task)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
                .andExpect(
                        jsonPath("$.message")
                                .value("To zadanie korzysta wyłącznie z założonych drifów."));
        verifyNoInteractions(executionGuard);
    }

    @ParameterizedTest
    @ValueSource(
            strings = {
                "[]",
                "[{\"id\":\"other\",\"templateId\":12,\"level\":6}]",
                "[{\"id\":\"chosen\",\"templateId\":12,\"level\":6},{\"id\":\"other\",\"templateId\":12,\"level\":6}]"
            })
    void insertionRejectsMissingDifferentAndAdditionalBackpackOccurrences(String entries)
            throws Exception {
        mockMvc.perform(
                        post("/api/optimizer/drifs")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                {"mode":"REORGANIZE","originalSlots":{"helmet":{"itemId":1}},
                 "reorganization":{"task":"INSERT","insertEntryId":"chosen"},"backpackDrifs":%s}
                """
                                                .formatted(entries)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
        verifyNoInteractions(executionGuard);
    }

    @Test
    void insertionAcceptsOnlyTheSpecificallyChosenBackpackOccurrence() throws Exception {
        when(executionGuard.optimize(any())).thenReturn(new OptimizationResponse(null, null));
        mockMvc.perform(
                        post("/api/optimizer/drifs")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                {"mode":"REORGANIZE","originalSlots":{"helmet":{"itemId":1}},
                 "reorganization":{"task":"INSERT","insertEntryId":"chosen"},
                 "backpackDrifs":[{"id":"chosen","templateId":12,"level":6}]}
                """))
                .andExpect(status().isOk());
        verify(executionGuard).optimize(any());
    }

    @Test
    void acceptsSeveralExactInsertionsWithTargetsAndAnEquippedUpgrade() throws Exception {
        when(executionGuard.optimize(any())).thenReturn(new OptimizationResponse(null, null));
        mockMvc.perform(
                        post("/api/optimizer/drifs")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                {"mode":"REORGANIZE","originalSlots":{"helmet":{"itemId":1}},
                 "reorganization":{"task":"INSERT","insertions":[{"entryId":"one","targetSlotKey":"armor"},{"entryId":"two"}],
                   "upgrades":[{"sourceSlotKey":"helmet","sourceDrifIndex":0,"targetTemplateId":12,"targetLevel":6}]},
                 "backpackDrifs":[{"id":"one","templateId":12,"level":6},{"id":"two","templateId":12,"level":6}]}
                """))
                .andExpect(status().isOk());
        var captured = ArgumentCaptor.forClass(OptimizationRequest.class);
        verify(executionGuard).optimize(captured.capture());
        org.junit.jupiter.api.Assertions.assertEquals(
                2, captured.getValue().getReorganization().requestedInsertions().size());
    }

    @ParameterizedTest
    @ValueSource(
            strings = {
                "[]",
                "[{\"entryId\":\"one\"},{\"entryId\":\"one\"}]",
                "[{\"entryId\":\"missing\"}]"
            })
    void rejectsEmptyDuplicateAndMissingInsertionListsBeforeTheWorker(String insertions)
            throws Exception {
        mockMvc.perform(
                        post("/api/optimizer/drifs")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                {"mode":"REORGANIZE","originalSlots":{"helmet":{"itemId":1}},
                 "reorganization":{"task":"INSERT","insertions":%s},
                 "backpackDrifs":[{"id":"one","templateId":12,"level":6}]}
                """
                                                .formatted(insertions)))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(executionGuard);
    }

    @Test
    void acceptsHighestLevelReorganizationWithDisabledProtectionsAndLargeAllowedLoss()
            throws Exception {
        when(executionGuard.optimize(any())).thenReturn(new OptimizationResponse(null, null));
        mockMvc.perform(
                        post("/api/optimizer/drifs")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                {
                                  "mode": "REORGANIZE", "configurationMode": "ADVANCED",
                                  "originalSlots": {"boots": {"itemId": 19, "drifIds": [76,52,108], "drifLevels": {"0":21,"1":6,"2":11}}},
                                  "priorities": {}, "backpackDrifs": [], "backpackSlotCount": 0,
                                  "reorganization": {
                                    "task": "UPGRADE", "allowUnequip": true, "preferFewestMoves": true,
                                    "upgrades": [{"sourceSlotKey":"boots","sourceDrifIndex":1,"targetTemplateId":52,"targetLevel":21,"maximizeLevel":true}],
                                    "protectedModifiers": {
                                      "DOUBLE_HIT_ROLL_CHANCE": {"enabled":false,"loss":0},
                                      "CRITICAL_DAMAGE_CHANCE_REDUCTION": {"enabled":false,"loss":0},
                                      "DAMAGE_MAGIC": {"enabled":true,"loss":121},
                                      "DAMAGE_REDUCTION": {"enabled":true,"loss":0}
                                    }
                                  }
                                }
                                """))
                .andExpect(status().isOk());
        var captured = ArgumentCaptor.forClass(OptimizationRequest.class);
        verify(executionGuard).optimize(captured.capture());
        var options = captured.getValue().getReorganization();
        org.junit.jupiter.api.Assertions.assertTrue(
                options.getUpgrades().getFirst().isMaximizeLevel());
        org.junit.jupiter.api.Assertions.assertFalse(
                options.getProtectedModifiers()
                        .get(DRIF_BONUS_TYPE.DOUBLE_HIT_ROLL_CHANCE)
                        .isEnabled());
        org.junit.jupiter.api.Assertions.assertEquals(
                121, options.getProtectedModifiers().get(DRIF_BONUS_TYPE.DAMAGE_MAGIC).getLoss());
    }

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
