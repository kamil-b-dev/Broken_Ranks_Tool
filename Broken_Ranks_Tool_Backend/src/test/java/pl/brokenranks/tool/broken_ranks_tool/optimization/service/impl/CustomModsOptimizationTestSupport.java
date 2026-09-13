package pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
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
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentPlacementRules;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.UpgradeLevelPolicy;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.locking.OptimizationLockService;

/** Shared service construction and domain fixtures for optimizer tests. */
abstract class CustomModsOptimizationTestSupport {
    protected CustomModsOptimizationServiceImpl service(
            ItemTemplate item,
            List<DrifTemplate> drifs,
            EquipmentStatsCalculatorService calculator) {
        return service(List.of(item), drifs, calculator);
    }

    protected CustomModsOptimizationServiceImpl service(
            List<ItemTemplate> items,
            List<DrifTemplate> drifs,
            EquipmentStatsCalculatorService calculator) {
        return service(items, drifs, calculator, Map.of());
    }

    protected CustomModsOptimizationServiceImpl service(
            List<ItemTemplate> items,
            List<DrifTemplate> drifs,
            EquipmentStatsCalculatorService calculator,
            Map<Long, Double> drifBonuses) {
        DrifTemplateRepository drifRepository = mock(DrifTemplateRepository.class);
        ItemTemplateRepository itemRepository = mock(ItemTemplateRepository.class);
        ItemStatProcessor itemStatProcessor = mock(ItemStatProcessor.class);
        EquipmentRulesRegistry rules = new EquipmentRulesRegistry();
        EquipmentPlacementRules placementRules = new EquipmentPlacementRules(rules);
        when(drifRepository.findAll()).thenReturn(drifs);
        when(itemRepository.findAllById(any())).thenReturn(items);
        when(itemStatProcessor.calculateFinalDrifMod(any(), anyInt()))
                .thenAnswer(
                        invocation -> {
                            ItemTemplate item = invocation.getArgument(0);
                            return drifBonuses.getOrDefault(item.getId(), 0.0);
                        });
        return OptimizationServiceTestFactory.create(
                drifRepository,
                itemRepository,
                placementRules,
                new UpgradeLevelPolicy(),
                rules,
                itemStatProcessor,
                new OptimizationLockService(),
                calculator);
    }

    protected OptimizationRequest request(Long itemId, Map<DRIF_BONUS_TYPE, Integer> priorities) {
        EquipmentRequest.SlotData slot = slot(itemId);

        OptimizationRequest request = new OptimizationRequest();
        request.setOriginalSlots(Map.of("helmet", slot));
        request.setPriorities(priorities);
        request.setTargetQuantities(Map.of());
        request.setLockedSlots(Set.of());
        request.setLockedDrifs(Map.of());
        request.setForceCapBonuses(Set.of());
        request.setMaximizeBonuses(Set.of());
        return request;
    }

    protected EquipmentRequest.SlotData slot(Long itemId) {
        EquipmentRequest.SlotData slot = new EquipmentRequest.SlotData();
        slot.setItemId(itemId);
        slot.setItemStars(1);
        slot.setDrifIds(List.of());
        slot.setDrifLevels(new HashMap<>());
        return slot;
    }

    protected ItemTemplate item(Long id, int capacity) {
        return item(id, capacity, ITEM_CATEGORY.HELMET);
    }

    protected ItemTemplate item(Long id, int capacity, ITEM_CATEGORY category) {
        return ItemTemplate.builder()
                .id(id)
                .name("Test XII")
                .category(category)
                .tier("XII")
                .rarity(RARITY.RARE)
                .capacity(capacity)
                .stats(Map.of())
                .build();
    }

    protected DrifTemplate drif(Long id, DRIF_BONUS_TYPE type, double base, double increment) {
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
