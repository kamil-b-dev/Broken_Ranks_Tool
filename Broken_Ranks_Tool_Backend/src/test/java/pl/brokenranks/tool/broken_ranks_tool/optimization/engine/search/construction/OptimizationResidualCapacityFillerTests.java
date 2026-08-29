package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.construction;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_SIZE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ITEM_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentPlacementRules;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.OptimizationPlacementOperations;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search.OptimizationStateEvaluation;

class OptimizationResidualCapacityFillerTests {

    @Test
    void fillsOneFreePositionWithAnAllowedOptionalDrif() {
        DRIF_BONUS_TYPE type = DRIF_BONUS_TYPE.CRITICAL_CHANCE;
        DrifTemplate drif =
                DrifTemplate.builder()
                        .id(1L)
                        .name("Critical")
                        .bonusType(type)
                        .size(DRIF_SIZE.SUBDRIF)
                        .baseValue("2%")
                        .increment("1%")
                        .build();
        ItemTemplate item =
                ItemTemplate.builder()
                        .id(2L)
                        .name("Helmet")
                        .category(ITEM_CATEGORY.HELMET)
                        .capacity(10)
                        .build();
        SlotContext slot =
                new SlotContext(
                        "helmet",
                        new EquipmentRequest.SlotData(),
                        item,
                        10,
                        1,
                        1.0,
                        List.of(drif),
                        Set.of(),
                        false);
        OptimizationContext context = context(slot, drif, type, Set.of());
        BuildState state = new BuildState();
        state.slots().put(slot.key(), new ArrayList<>(Collections.singletonList(null)));
        OptimizationStateEvaluation evaluation = mock(OptimizationStateEvaluation.class);
        when(evaluation.globalCount(any(), eq(type), any())).thenReturn(0);
        when(evaluation.minimumsSatisfied(any(), any())).thenReturn(true);
        when(evaluation.score(any(), any())).thenReturn(0.0);
        EquipmentRulesRegistry rules = new EquipmentRulesRegistry();
        OptimizationPlacementOperations placements =
                new OptimizationPlacementOperations(new EquipmentPlacementRules(rules), rules);

        new OptimizationResidualCapacityFiller(placements, evaluation).fill(state, context);

        assertEquals(drif, state.slots().get("helmet").get(0).drif());
    }

    @Test
    void leavesUserLockedSlotUnchanged() {
        DRIF_BONUS_TYPE type = DRIF_BONUS_TYPE.CRITICAL_CHANCE;
        DrifTemplate drif =
                DrifTemplate.builder().id(1L).bonusType(type).size(DRIF_SIZE.SUBDRIF).build();
        SlotContext slot =
                new SlotContext(
                        "helmet",
                        new EquipmentRequest.SlotData(),
                        ItemTemplate.builder()
                                .id(2L)
                                .category(ITEM_CATEGORY.HELMET)
                                .capacity(10)
                                .build(),
                        10,
                        1,
                        1.0,
                        List.of(drif),
                        Set.of(),
                        false);
        OptimizationContext context = context(slot, drif, type, Set.of("helmet"));
        BuildState state = new BuildState();
        state.slots().put(slot.key(), new ArrayList<>(Collections.singletonList(null)));
        EquipmentRulesRegistry rules = new EquipmentRulesRegistry();
        OptimizationPlacementOperations placements =
                new OptimizationPlacementOperations(new EquipmentPlacementRules(rules), rules);

        new OptimizationResidualCapacityFiller(placements, mock(OptimizationStateEvaluation.class))
                .fill(state, context);

        assertNull(state.slots().get("helmet").get(0));
    }

    private OptimizationContext context(
            SlotContext slot, DrifTemplate drif, DRIF_BONUS_TYPE type, Set<String> lockedSlots) {
        OptimizationRequest request = new OptimizationRequest();
        request.setPriorities(Map.of(type, 1));
        request.setTargetQuantities(Map.of());
        request.setLockedSlots(lockedSlots);
        return new OptimizationContext(
                request,
                Map.of(slot.item().getId(), slot.item()),
                Map.of(drif.getId(), drif),
                List.of(slot),
                Map.of(slot.drifBonus(), List.of(slot)),
                List.of(Map.entry(type, 1)),
                List.of(),
                new SearchBudget(10),
                new SearchBudget(10),
                new SearchBudget(10),
                new HashMap<>(),
                new HashMap<>(),
                new HashMap<>(),
                new HashMap<>(),
                new HashMap<>());
    }
}
