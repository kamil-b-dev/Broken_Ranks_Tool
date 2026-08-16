package pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl;

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

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl.OptimizationSearchModel.*;

class OptimizationLargeNeighborhoodSearchTests {

    @Test
    void movesMaximizedModifierToItemWithHigherDrifBonus() {
        EquipmentRulesRegistry rules = new EquipmentRulesRegistry();
        OptimizationStateEvaluator evaluator = new OptimizationStateEvaluator(rules);
        EquipmentStatsCalculatorService calculator = mock(EquipmentStatsCalculatorService.class);
        DrifTemplate magic = drif(30L, DRIF_BONUS_TYPE.DAMAGE_MAGIC, 3.0, 0.5);
        DrifTemplate defense = drif(31L, DRIF_BONUS_TYPE.DEFENSE_MENTAL, 3.0, 0.5);
        when(calculator.calculateTotalStats(any())).thenAnswer(invocation -> {
            EquipmentRequest setup = invocation.getArgument(0);
            boolean magicOnHighBonusItem = setup.getSlots().get("high").getDrifIds()
                    .contains(magic.getId());
            return Map.of(
                    DRIF_BONUS_TYPE.DAMAGE_MAGIC.name(),
                    magicOnHighBonusItem ? "20%" : "10%",
                    DRIF_BONUS_TYPE.DEFENSE_MENTAL.name(), "10%"
            );
        });
        OptimizationResultAssembler assembler = new OptimizationResultAssembler(
                new OptimizationLockService(), calculator, evaluator);
        OptimizationLargeNeighborhoodSearch search = new OptimizationLargeNeighborhoodSearch(
                rules, evaluator, assembler);

        ItemTemplate lowItem = ItemTemplate.builder()
                .id(3L).name("Low XII").category(ITEM_CATEGORY.HELMET)
                .tier("XII").rarity(RARITY.RARE).capacity(20).stats(Map.of()).build();
        ItemTemplate highItem = ItemTemplate.builder()
                .id(4L).name("High XII").category(ITEM_CATEGORY.ARMOR)
                .tier("XII").rarity(RARITY.RARE).capacity(20).stats(Map.of()).build();
        EquipmentRequest.SlotData lowOriginal = emptySlot(lowItem.getId());
        EquipmentRequest.SlotData highOriginal = emptySlot(highItem.getId());

        OptimizationRequest request = new OptimizationRequest();
        request.setOriginalSlots(Map.of("low", lowOriginal, "high", highOriginal));
        request.setPriorities(Map.of(
                DRIF_BONUS_TYPE.DAMAGE_MAGIC, 30,
                DRIF_BONUS_TYPE.DEFENSE_MENTAL, 5));
        request.setTargetQuantities(Map.of(
                DRIF_BONUS_TYPE.DAMAGE_MAGIC, new OptimizationRequest.QuantityRange(1, 1),
                DRIF_BONUS_TYPE.DEFENSE_MENTAL, new OptimizationRequest.QuantityRange(1, 1)));
        request.setForceCapBonuses(Set.of());
        request.setMaximizeBonuses(Set.of(DRIF_BONUS_TYPE.DAMAGE_MAGIC));
        request.setLockedSlots(Set.of());
        request.setLockedDrifs(Map.of());

        SlotContext low = new SlotContext("low", lowOriginal, lowItem, 20, 1, 0.0,
                new ArrayList<>(List.of(magic, defense)), Set.of(), false);
        SlotContext high = new SlotContext("high", highOriginal, highItem, 20, 1, 0.5,
                new ArrayList<>(List.of(magic, defense)), Set.of(), false);
        OptimizationContext context = new OptimizationContext(
                request, Map.of(lowItem.getId(), lowItem, highItem.getId(), highItem),
                Map.of(magic.getId(), magic, defense.getId(), defense),
                List.of(low, high), Map.of(0.0, List.of(low), 0.5, List.of(high)),
                request.getPriorities().entrySet().stream().toList(),
                request.getTargetQuantities().entrySet().stream().toList(),
                new SearchBudget(10), new SearchBudget(10), new SearchBudget(10),
                new EnumMap<>(DRIF_BONUS_TYPE.class), new EnumMap<>(DRIF_BONUS_TYPE.class),
                new HashMap<>(), new HashMap<>(), new HashMap<>());
        BuildState initial = new BuildState();
        initial.slots.put("low", new ArrayList<>(List.of(new Placement(magic, 21, false))));
        initial.slots.put("high", new ArrayList<>(List.of(new Placement(defense, 21, false))));

        BuildState improved = search.improve(initial, context);

        assertEquals(magic.getId(), improved.slots.get("high").get(0).drif().getId());
        assertEquals(defense.getId(), improved.slots.get("low").get(0).drif().getId());
    }

    @Test
    void keepsStrongerNegativeReductionValue() {
        EquipmentRulesRegistry rules = new EquipmentRulesRegistry();
        OptimizationStateEvaluator evaluator = new OptimizationStateEvaluator(rules);
        EquipmentStatsCalculatorService calculator = mock(EquipmentStatsCalculatorService.class);
        DrifTemplate stronger = drif(20L, DRIF_BONUS_TYPE.MANA_USAGE_REDUCTION, -1.0, -0.1);
        DrifTemplate weaker = drif(21L, DRIF_BONUS_TYPE.MANA_USAGE_REDUCTION, -20.0, -1.0);
        when(calculator.calculateTotalStats(any())).thenAnswer(invocation -> {
            EquipmentRequest setup = invocation.getArgument(0);
            boolean containsWeaker = setup.getSlots().get("helmet").getDrifIds()
                    .contains(weaker.getId());
            return Map.of(DRIF_BONUS_TYPE.MANA_USAGE_REDUCTION.name(),
                    containsWeaker ? "-12.65%" : "-18.4%");
        });
        OptimizationResultAssembler assembler = new OptimizationResultAssembler(
                new OptimizationLockService(), calculator, evaluator);
        OptimizationLargeNeighborhoodSearch search = new OptimizationLargeNeighborhoodSearch(
                rules, evaluator, assembler);

        ItemTemplate item = ItemTemplate.builder()
                .id(2L).name("Test XII").category(ITEM_CATEGORY.HELMET)
                .tier("XII").rarity(RARITY.RARE).capacity(25).stats(Map.of()).build();
        EquipmentRequest.SlotData original = new EquipmentRequest.SlotData();
        original.setItemId(item.getId());
        original.setItemStars(1);
        original.setDrifIds(List.of());
        original.setDrifLevels(Map.of());

        OptimizationRequest request = new OptimizationRequest();
        request.setOriginalSlots(Map.of("helmet", original));
        request.setPriorities(Map.of(DRIF_BONUS_TYPE.MANA_USAGE_REDUCTION, 15));
        request.setTargetQuantities(Map.of(DRIF_BONUS_TYPE.MANA_USAGE_REDUCTION,
                new OptimizationRequest.QuantityRange(0, 1)));
        request.setForceCapBonuses(Set.of());
        request.setMaximizeBonuses(Set.of());
        request.setLockedSlots(Set.of());
        request.setLockedDrifs(Map.of());

        SlotContext slot = new SlotContext("helmet", original, item, 25, 3, 0.0,
                new ArrayList<>(List.of(weaker, stronger)), Set.of(), false);
        OptimizationContext context = new OptimizationContext(
                request, Map.of(item.getId(), item),
                Map.of(stronger.getId(), stronger, weaker.getId(), weaker),
                List.of(slot), Map.of(0.0, List.of(slot)),
                request.getPriorities().entrySet().stream().toList(),
                request.getTargetQuantities().entrySet().stream().toList(),
                new SearchBudget(10), new SearchBudget(10), new SearchBudget(10),
                new EnumMap<>(DRIF_BONUS_TYPE.class), new EnumMap<>(DRIF_BONUS_TYPE.class),
                new HashMap<>(), new HashMap<>(), new HashMap<>());
        BuildState initial = new BuildState();
        List<Placement> placements = new ArrayList<>();
        placements.add(new Placement(stronger, 21, false));
        placements.add(null);
        placements.add(null);
        initial.slots.put("helmet", placements);

        BuildState improved = search.improve(initial, context);

        assertEquals(stronger.getId(), improved.slots.get("helmet").get(0).drif().getId());
    }

    @Test
    void replacesLowerUtilityModifierInFinalNeighborhood() {
        EquipmentRulesRegistry rules = new EquipmentRulesRegistry();
        OptimizationStateEvaluator evaluator = new OptimizationStateEvaluator(rules);
        EquipmentStatsCalculatorService calculator = mock(EquipmentStatsCalculatorService.class);
        DrifTemplate mentalDefense = drif(10L, DRIF_BONUS_TYPE.DEFENSE_MENTAL, 9.0, 1.5);
        DrifTemplate magicDamage = drif(11L, DRIF_BONUS_TYPE.DAMAGE_MAGIC, 3.0, 0.5);
        when(calculator.calculateTotalStats(any())).thenAnswer(invocation -> {
            EquipmentRequest setup = invocation.getArgument(0);
            boolean containsMagic = setup.getSlots().get("helmet").getDrifIds()
                    .contains(magicDamage.getId());
            return Map.of(
                    DRIF_BONUS_TYPE.DAMAGE_MAGIC.name(), containsMagic ? "10%" : "0%",
                    DRIF_BONUS_TYPE.DEFENSE_MENTAL.name(), containsMagic ? "0%" : "5%"
            );
        });
        OptimizationResultAssembler assembler = new OptimizationResultAssembler(
                new OptimizationLockService(), calculator, evaluator);
        OptimizationLargeNeighborhoodSearch search = new OptimizationLargeNeighborhoodSearch(
                rules, evaluator, assembler);

        ItemTemplate item = ItemTemplate.builder()
                .id(1L).name("Test XII").category(ITEM_CATEGORY.HELMET)
                .tier("XII").rarity(RARITY.RARE).capacity(6).stats(Map.of()).build();
        EquipmentRequest.SlotData original = new EquipmentRequest.SlotData();
        original.setItemId(item.getId());
        original.setItemStars(1);
        original.setDrifIds(List.of());
        original.setDrifLevels(Map.of());

        OptimizationRequest request = new OptimizationRequest();
        request.setOriginalSlots(Map.of("helmet", original));
        request.setPriorities(Map.of(
                DRIF_BONUS_TYPE.DAMAGE_MAGIC, 30,
                DRIF_BONUS_TYPE.DEFENSE_MENTAL, 5));
        request.setTargetQuantities(Map.of(
                DRIF_BONUS_TYPE.DAMAGE_MAGIC, new OptimizationRequest.QuantityRange(0, 1),
                DRIF_BONUS_TYPE.DEFENSE_MENTAL, new OptimizationRequest.QuantityRange(0, 12)));
        request.setForceCapBonuses(Set.of());
        request.setMaximizeBonuses(Set.of());
        request.setLockedSlots(Set.of());
        request.setLockedDrifs(Map.of());

        SlotContext slot = new SlotContext("helmet", original, item, 6, 3, 0.0,
                new ArrayList<>(List.of(magicDamage, mentalDefense)), Set.of(), false);
        OptimizationContext context = new OptimizationContext(
                request,
                Map.of(item.getId(), item),
                Map.of(mentalDefense.getId(), mentalDefense, magicDamage.getId(), magicDamage),
                List.of(slot), Map.of(0.0, List.of(slot)),
                request.getPriorities().entrySet().stream().toList(),
                request.getTargetQuantities().entrySet().stream().toList(),
                new SearchBudget(10), new SearchBudget(10), new SearchBudget(10),
                new EnumMap<>(DRIF_BONUS_TYPE.class), new EnumMap<>(DRIF_BONUS_TYPE.class),
                new HashMap<>(), new HashMap<>(), new HashMap<>());
        BuildState initial = new BuildState();
        List<Placement> placements = new ArrayList<>();
        placements.add(new Placement(mentalDefense, 21, false));
        placements.add(null);
        placements.add(null);
        initial.slots.put("helmet", placements);

        BuildState improved = search.improve(initial, context);

        Placement replacement = improved.slots.get("helmet").get(0);
        assertEquals(magicDamage.getId(), replacement.drif().getId());
        assertEquals(11, replacement.level());
    }

    private DrifTemplate drif(Long id, DRIF_BONUS_TYPE type,
                              double baseValue, double increment) {
        return DrifTemplate.builder()
                .id(id).name(type.name()).size(DRIF_SIZE.ARCYDRIF).bonusType(type)
                .baseValue(baseValue + "%").increment(increment + "%").build();
    }

    private EquipmentRequest.SlotData emptySlot(Long itemId) {
        EquipmentRequest.SlotData slot = new EquipmentRequest.SlotData();
        slot.setItemId(itemId);
        slot.setItemStars(1);
        slot.setDrifIds(List.of());
        slot.setDrifLevels(Map.of());
        return slot;
    }
}
