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
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.DrifTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.ItemTemplateRepository;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.EquipmentStatsCalculatorService;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.processor.ItemStatProcessor;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentValidator;
import pl.brokenranks.tool.broken_ranks_tool.optimization.constraints.OptimizationLockService;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationResponse;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.atMost;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CustomModsOptimizationServiceImplTests {

    @Test
    void keepsHighestCapacityLevelAfterForcedCapIsReached() {
        ItemTemplate item = item(1L, 12);
        DrifTemplate criticalChance = drif(10L, DRIF_BONUS_TYPE.CRITICAL_CHANCE, 2.0, 4.0);
        EquipmentStatsCalculatorService calculator = mock(EquipmentStatsCalculatorService.class);
        when(calculator.calculateTotalStats(any())).thenAnswer(invocation -> {
            EquipmentRequest setup = invocation.getArgument(0);
            EquipmentRequest.SlotData slot = setup.getSlots().get("helmet");
            double value = 2.0;
            if (slot.getDrifIds() != null && !slot.getDrifIds().isEmpty()) {
                int level = slot.getDrifLevels().getOrDefault("0", 1);
                value += 2.0 + Math.max(0, level - 1) * 4.0;
            }
            return Map.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE.name(), value + "%");
        });

        CustomModsOptimizationServiceImpl service = service(item, List.of(criticalChance), calculator);
        OptimizationRequest request = request(item.getId(), Map.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE, 30));
        request.setForceCapBonuses(Set.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE));

        OptimizationResponse response = service.optimize(request);

        assertTrue(response.getSummary().isSuccess());
        EquipmentRequest.SlotData result = response.getOptimizedSetup().getSlots().get("helmet");
        assertEquals(List.of(criticalChance.getId()), result.getDrifIds());
        assertEquals(16, result.getDrifLevels().get("0"));
        verify(calculator, atMost(2)).calculateTotalStats(any());
    }

    @Test
    void allocatesHigherPowerTierToHigherPriorityDrif() {
        ItemTemplate item = item(1L, 12);
        DrifTemplate magicDamage = drif(10L, DRIF_BONUS_TYPE.DAMAGE_MAGIC, 2.0, 2.0);
        DrifTemplate rangedHit = drif(11L, DRIF_BONUS_TYPE.HIT_CHANCE_RANGED, 2.0, 2.0);
        EquipmentStatsCalculatorService calculator = mock(EquipmentStatsCalculatorService.class);
        when(calculator.calculateTotalStats(any())).thenReturn(Map.of());

        CustomModsOptimizationServiceImpl service = service(item, List.of(magicDamage, rangedHit), calculator);
        Map<DRIF_BONUS_TYPE, Integer> priorities = new LinkedHashMap<>();
        priorities.put(DRIF_BONUS_TYPE.DAMAGE_MAGIC, 30);
        priorities.put(DRIF_BONUS_TYPE.HIT_CHANCE_RANGED, 10);

        OptimizationRequest request = request(item.getId(), priorities);
        request.setTargetQuantities(Map.of(
                DRIF_BONUS_TYPE.DAMAGE_MAGIC, new OptimizationRequest.QuantityRange(1, 12),
                DRIF_BONUS_TYPE.HIT_CHANCE_RANGED, new OptimizationRequest.QuantityRange(1, 12)
        ));
        OptimizationResponse response = service.optimize(request);

        assertTrue(response.getSummary().isSuccess());
        EquipmentRequest.SlotData result = response.getOptimizedSetup().getSlots().get("helmet");
        Map<Long, Integer> levelsById = new HashMap<>();
        for (int index = 0; index < result.getDrifIds().size(); index++) {
            levelsById.put(result.getDrifIds().get(index), result.getDrifLevels().get(String.valueOf(index)));
        }
        assertEquals(16, levelsById.get(magicDamage.getId()));
        assertEquals(6, levelsById.get(rangedHit.getId()));

        OptimizationResponse repeated = service.optimize(request);
        assertEquals(response.getOptimizedSetup().getSlots(), repeated.getOptimizedSetup().getSlots());
    }

    private CustomModsOptimizationServiceImpl service(ItemTemplate item, List<DrifTemplate> drifs,
                                                       EquipmentStatsCalculatorService calculator) {
        DrifTemplateRepository drifRepository = mock(DrifTemplateRepository.class);
        ItemTemplateRepository itemRepository = mock(ItemTemplateRepository.class);
        ItemStatProcessor itemStatProcessor = mock(ItemStatProcessor.class);
        EquipmentRulesRegistry rules = new EquipmentRulesRegistry();
        EquipmentValidator validator = new EquipmentValidator(rules);
        when(drifRepository.findAll()).thenReturn(drifs);
        when(itemRepository.findAllById(any())).thenReturn(List.of(item));
        when(itemStatProcessor.calculateFinalDrifMod(any(), anyInt())).thenReturn(0.0);
        return new CustomModsOptimizationServiceImpl(
                drifRepository,
                itemRepository,
                validator,
                rules,
                itemStatProcessor,
                new OptimizationLockService(),
                calculator
        );
    }

    private OptimizationRequest request(Long itemId, Map<DRIF_BONUS_TYPE, Integer> priorities) {
        EquipmentRequest.SlotData slot = new EquipmentRequest.SlotData();
        slot.setItemId(itemId);
        slot.setItemStars(1);
        slot.setDrifIds(List.of());
        slot.setDrifLevels(new HashMap<>());

        OptimizationRequest request = new OptimizationRequest();
        request.setOriginalSlots(Map.of("helmet", slot));
        request.setPriorities(priorities);
        request.setTargetQuantities(Map.of());
        request.setTargetValues(Map.of());
        request.setLockedSlots(Set.of());
        request.setLockedDrifs(Map.of());
        request.setForceCapBonuses(Set.of());
        request.setCriticalBonuses(Set.of());
        return request;
    }

    private ItemTemplate item(Long id, int capacity) {
        return ItemTemplate.builder()
                .id(id)
                .name("Test XII")
                .category(ITEM_CATEGORY.HELMET)
                .tier("XII")
                .rarity(RARITY.RARE)
                .capacity(capacity)
                .stats(Map.of())
                .build();
    }

    private DrifTemplate drif(Long id, DRIF_BONUS_TYPE type, double base, double increment) {
        return DrifTemplate.builder()
                .id(id)
                .name(type.name())
                .size(DRIF_SIZE.ARCYDRIF)
                .bonusType(type)
                .baseValue(base + "%")
                .increment(increment + "%")
                .build();
    }
}
