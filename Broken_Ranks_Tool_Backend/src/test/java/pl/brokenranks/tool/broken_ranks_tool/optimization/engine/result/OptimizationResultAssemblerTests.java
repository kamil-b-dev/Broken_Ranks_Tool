package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.result;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.*;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_SIZE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ITEM_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.RARITY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.EquipmentStatsCalculatorService;
import pl.brokenranks.tool.broken_ranks_tool.optimization.constraints.OptimizationLockService;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationStateEvaluator;

class OptimizationResultAssemblerTests {

    @Test
    void fallsBackToSearchValueWhenCalculatorFails() {
        EquipmentRulesRegistry rules = new EquipmentRulesRegistry();
        OptimizationStateEvaluator evaluator = new OptimizationStateEvaluator(rules);
        EquipmentStatsCalculatorService calculator = mock(EquipmentStatsCalculatorService.class);
        when(calculator.calculateTotalStats(any()))
                .thenThrow(new IllegalStateException("calculator unavailable"));
        OptimizationResultAssembler assembler =
                new OptimizationResultAssembler(
                        new OptimizationLockService(), calculator, evaluator);
        DrifTemplate magic =
                DrifTemplate.builder()
                        .id(1L)
                        .name("Magic")
                        .size(DRIF_SIZE.ARCYDRIF)
                        .bonusType(DRIF_BONUS_TYPE.DAMAGE_MAGIC)
                        .baseValue("2%")
                        .increment("0.5%")
                        .build();
        ItemTemplate item =
                ItemTemplate.builder()
                        .id(1L)
                        .name("Helmet")
                        .category(ITEM_CATEGORY.HELMET)
                        .tier("XII")
                        .rarity(RARITY.RARE)
                        .capacity(24)
                        .stats(Map.of())
                        .build();
        EquipmentRequest.SlotData original = new EquipmentRequest.SlotData();
        original.setItemId(item.getId());
        original.setItemStars(1);
        original.setDrifIds(List.of());
        original.setDrifLevels(Map.of());
        OptimizationRequest request = new OptimizationRequest();
        request.setOriginalSlots(Map.of("helmet", original));
        request.setPriorities(Map.of(DRIF_BONUS_TYPE.DAMAGE_MAGIC, 10));
        request.setTargetQuantities(Map.of());
        request.setLockedSlots(Set.of());
        request.setLockedDrifs(Map.of());
        request.setForceCapBonuses(Set.of());
        request.setMaximizeBonuses(Set.of());
        SlotContext slot =
                new SlotContext(
                        "helmet",
                        original,
                        item,
                        24,
                        1,
                        0.0,
                        new ArrayList<>(List.of(magic)),
                        Set.of(),
                        false);
        OptimizationContext context =
                new OptimizationContext(
                        request,
                        Map.of(item.getId(), item),
                        Map.of(magic.getId(), magic),
                        List.of(slot),
                        Map.of(0.0, List.of(slot)),
                        request.getPriorities().entrySet().stream().toList(),
                        List.of(),
                        new SearchBudget(1),
                        new SearchBudget(1),
                        new SearchBudget(1),
                        new EnumMap<>(DRIF_BONUS_TYPE.class),
                        new EnumMap<>(DRIF_BONUS_TYPE.class),
                        new HashMap<>(),
                        new HashMap<>(),
                        new HashMap<>());
        BuildState state = new BuildState();
        state.slots().put("helmet", new ArrayList<>(List.of(new Placement(magic, 6, false))));

        double expected = evaluator.calculatedValue(state, DRIF_BONUS_TYPE.DAMAGE_MAGIC, context);

        assertEquals(expected, assembler.actualValue(state, DRIF_BONUS_TYPE.DAMAGE_MAGIC, context));
        assertTrue(assembler.forcedCapWarnings(state, context).isEmpty());
    }
}
