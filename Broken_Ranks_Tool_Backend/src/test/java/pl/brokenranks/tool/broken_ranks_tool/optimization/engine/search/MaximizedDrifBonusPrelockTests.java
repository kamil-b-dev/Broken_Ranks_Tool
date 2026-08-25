package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.search;

import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.evaluation.OptimizationStateEvaluator;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_SIZE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ITEM_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.RARITY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.EquipmentRulesRegistry;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.*;

class MaximizedDrifBonusPrelockTests {

    @Test
    void locksMaximumDrifsOnHighestBonusItemInPriorityOrder() {
        DrifTemplate magicArc = drif(1L, DRIF_BONUS_TYPE.DAMAGE_MAGIC, DRIF_SIZE.ARCYDRIF);
        DrifTemplate magicMagni = drif(2L, DRIF_BONUS_TYPE.DAMAGE_MAGIC, DRIF_SIZE.MAGNIDRIF);
        DrifTemplate rangedArc = drif(3L, DRIF_BONUS_TYPE.HIT_CHANCE_RANGED, DRIF_SIZE.ARCYDRIF);
        ItemTemplate highItem = item(10L, "High XII");
        ItemTemplate lowItem = item(11L, "Low XII");
        EquipmentRequest.SlotData highOriginal = slot(highItem.getId());
        EquipmentRequest.SlotData lowOriginal = slot(lowItem.getId());

        OptimizationRequest request = new OptimizationRequest();
        request.setOriginalSlots(Map.of("high", highOriginal, "low", lowOriginal));
        Map<DRIF_BONUS_TYPE, Integer> priorities = new LinkedHashMap<>();
        priorities.put(DRIF_BONUS_TYPE.DAMAGE_MAGIC, 30);
        priorities.put(DRIF_BONUS_TYPE.HIT_CHANCE_RANGED, 20);
        request.setPriorities(priorities);
        request.setTargetQuantities(Map.of(
                DRIF_BONUS_TYPE.DAMAGE_MAGIC, new OptimizationRequest.QuantityRange(1, 1),
                DRIF_BONUS_TYPE.HIT_CHANCE_RANGED, new OptimizationRequest.QuantityRange(1, 1)));
        request.setMaximizeBonuses(Set.of(
                DRIF_BONUS_TYPE.DAMAGE_MAGIC, DRIF_BONUS_TYPE.HIT_CHANCE_RANGED));
        request.setLockedSlots(Set.of());

        List<DrifTemplate> candidates = new ArrayList<>(
                List.of(magicMagni, rangedArc, magicArc));
        SlotContext high = new SlotContext("high", highOriginal, highItem,
                24, 2, 0.75, candidates, Set.of(), false);
        SlotContext low = new SlotContext("low", lowOriginal, lowItem,
                24, 2, 0.0, candidates, Set.of(), false);
        OptimizationContext context = new OptimizationContext(request,
                Map.of(highItem.getId(), highItem, lowItem.getId(), lowItem),
                Map.of(magicArc.getId(), magicArc, magicMagni.getId(), magicMagni,
                        rangedArc.getId(), rangedArc),
                List.of(low, high), Map.of(0.0, List.of(low), 0.75, List.of(high)),
                priorities.entrySet().stream().toList(),
                request.getTargetQuantities().entrySet().stream().toList(),
                new SearchBudget(1), new SearchBudget(1), new SearchBudget(1),
                new EnumMap<>(DRIF_BONUS_TYPE.class), new EnumMap<>(DRIF_BONUS_TYPE.class),
                new HashMap<>(), new HashMap<>(), new HashMap<>());
        BuildState state = new BuildState();
        state.slots().put("high", new ArrayList<>(java.util.Arrays.asList(null, null)));
        state.slots().put("low", new ArrayList<>(java.util.Arrays.asList(null, null)));

        new MaximizedDrifBonusPrelock(new EquipmentRulesRegistry()).apply(state, context);

        assertEquals(magicArc.getId(), state.slots().get("high").get(0).drif().getId());
        assertEquals(21, state.slots().get("high").get(0).level());
        assertTrue(state.slots().get("high").get(0).locked());
        assertEquals(rangedArc.getId(), state.slots().get("high").get(1).drif().getId());
        assertTrue(state.slots().get("high").get(1).locked());
        assertTrue(state.slots().get("low").stream().allMatch(placement -> placement == null));
    }

    @Test
    void rejectsMaximumExceededByLockedPlacements() {
        DrifTemplate magic = drif(1L, DRIF_BONUS_TYPE.DAMAGE_MAGIC, DRIF_SIZE.ARCYDRIF);
        ItemTemplate firstItem = item(10L, "First XII");
        ItemTemplate secondItem = item(11L, "Second XII");
        EquipmentRequest.SlotData firstOriginal = slot(firstItem.getId());
        EquipmentRequest.SlotData secondOriginal = slot(secondItem.getId());
        OptimizationRequest request = new OptimizationRequest();
        request.setOriginalSlots(Map.of("first", firstOriginal, "second", secondOriginal));
        request.setPriorities(Map.of(DRIF_BONUS_TYPE.DAMAGE_MAGIC, 30));
        request.setTargetQuantities(Map.of(DRIF_BONUS_TYPE.DAMAGE_MAGIC,
                new OptimizationRequest.QuantityRange(0, 1)));
        SlotContext first = new SlotContext("first", firstOriginal, firstItem,
                24, 2, 0.5, new ArrayList<>(List.of(magic)), Set.of(), false);
        SlotContext second = new SlotContext("second", secondOriginal, secondItem,
                24, 2, 0.0, new ArrayList<>(List.of(magic)), Set.of(), false);
        OptimizationContext context = new OptimizationContext(request,
                Map.of(firstItem.getId(), firstItem, secondItem.getId(), secondItem),
                Map.of(magic.getId(), magic), List.of(first, second),
                Map.of(0.0, List.of(second), 0.5, List.of(first)),
                request.getPriorities().entrySet().stream().toList(),
                request.getTargetQuantities().entrySet().stream().toList(),
                new SearchBudget(1), new SearchBudget(1), new SearchBudget(1),
                new EnumMap<>(DRIF_BONUS_TYPE.class), new EnumMap<>(DRIF_BONUS_TYPE.class),
                new HashMap<>(), new HashMap<>(), new HashMap<>());
        BuildState state = new BuildState();
        state.slots().put("first", new ArrayList<>(List.of(new Placement(magic, 21, true))));
        state.slots().put("second", new ArrayList<>(List.of(new Placement(magic, 21, true))));

        assertFalse(new OptimizationStateEvaluator(new EquipmentRulesRegistry())
                .minimumsSatisfied(state, context));
    }

    @Test
    void prelocksExactlyTheConfiguredMinimum() {
        DrifTemplate magic = drif(1L, DRIF_BONUS_TYPE.DAMAGE_MAGIC, DRIF_SIZE.ARCYDRIF);
        ItemTemplate highItem = item(10L, "High XII");
        ItemTemplate lowItem = item(11L, "Low XII");
        EquipmentRequest.SlotData highOriginal = slot(highItem.getId());
        EquipmentRequest.SlotData lowOriginal = slot(lowItem.getId());
        OptimizationRequest request = new OptimizationRequest();
        request.setOriginalSlots(Map.of("high", highOriginal, "low", lowOriginal));
        request.setPriorities(Map.of(DRIF_BONUS_TYPE.DAMAGE_MAGIC, 30));
        request.setTargetQuantities(Map.of(DRIF_BONUS_TYPE.DAMAGE_MAGIC,
                new OptimizationRequest.QuantityRange(2, 7)));
        request.setMaximizeBonuses(Set.of(DRIF_BONUS_TYPE.DAMAGE_MAGIC));
        request.setLockedSlots(Set.of());
        SlotContext high = new SlotContext("high", highOriginal, highItem,
                24, 2, 0.75, new ArrayList<>(List.of(magic)), Set.of(), false);
        SlotContext low = new SlotContext("low", lowOriginal, lowItem,
                24, 2, 0.0, new ArrayList<>(List.of(magic)), Set.of(), false);
        OptimizationContext context = new OptimizationContext(request,
                Map.of(highItem.getId(), highItem, lowItem.getId(), lowItem),
                Map.of(magic.getId(), magic), List.of(low, high),
                Map.of(0.0, List.of(low), 0.75, List.of(high)),
                request.getPriorities().entrySet().stream().toList(),
                request.getTargetQuantities().entrySet().stream().toList(),
                new SearchBudget(1), new SearchBudget(1), new SearchBudget(1),
                new EnumMap<>(DRIF_BONUS_TYPE.class), new EnumMap<>(DRIF_BONUS_TYPE.class),
                new HashMap<>(), new HashMap<>(), new HashMap<>());
        BuildState state = new BuildState();
        state.slots().put("high", new ArrayList<>(java.util.Arrays.asList(null, null)));
        state.slots().put("low", new ArrayList<>(java.util.Arrays.asList(null, null)));

        new MaximizedDrifBonusPrelock(new EquipmentRulesRegistry()).apply(state, context);

        assertEquals(2, state.slots().values().stream().flatMap(List::stream)
                .filter(placement -> placement != null).count());
        assertEquals(magic.getId(), state.slots().get("high").getFirst().drif().getId());
        assertTrue(state.slots().get("high").getFirst().locked());
        assertEquals(magic.getId(), state.slots().get("low").getFirst().drif().getId());
        assertTrue(state.slots().get("low").getFirst().locked());
    }

    private DrifTemplate drif(Long id, DRIF_BONUS_TYPE type, DRIF_SIZE size) {
        return DrifTemplate.builder().id(id).name(type.name()).size(size).bonusType(type)
                .baseValue("1%").increment("1%").build();
    }

    private ItemTemplate item(Long id, String name) {
        return ItemTemplate.builder().id(id).name(name).category(ITEM_CATEGORY.HELMET)
                .tier("XII").rarity(RARITY.RARE).capacity(24).stats(Map.of()).build();
    }

    private EquipmentRequest.SlotData slot(Long itemId) {
        EquipmentRequest.SlotData slot = new EquipmentRequest.SlotData();
        slot.setItemId(itemId);
        slot.setItemStars(1);
        slot.setDrifIds(List.of());
        slot.setDrifLevels(Map.of());
        return slot;
    }
}
