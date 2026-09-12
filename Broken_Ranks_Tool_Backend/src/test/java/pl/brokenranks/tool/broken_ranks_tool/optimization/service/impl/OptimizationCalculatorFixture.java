package pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.util.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.persistence.repository.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.EquipmentStatsCalculatorService;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.input.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.processor.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.calculator.random.RandomProvider;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.impl.EquipmentStatsCalculatorTestFactory;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.constraints.OptimizationLockService;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;

/** Uses production search and calculator; only catalog persistence and randomness are replaced. */
record OptimizationCalculatorFixture(
        CustomModsOptimizationServiceImpl service, EquipmentStatsCalculatorService calculator) {
    static OptimizationCalculatorFixture create(
            List<ItemTemplate> items, List<DrifTemplate> drifs, List<OrbTemplate> orbs) {
        var itemRepo = mock(ItemTemplateRepository.class);
        var drifRepo = mock(DrifTemplateRepository.class);
        var orbRepo = mock(OrbTemplateRepository.class);
        when(itemRepo.findAllById(any())).thenReturn(items);
        when(drifRepo.findAll()).thenReturn(drifs);
        when(drifRepo.findAllById(any())).thenReturn(drifs);
        when(orbRepo.findAllById(any())).thenReturn(orbs);
        var rules = new EquipmentRulesRegistry();
        var placement = new EquipmentPlacementRules(rules);
        var levels = new UpgradeLevelPolicy();
        var itemProcessor = new ItemStatProcessor(mock(RandomProvider.class));
        var calculator =
                EquipmentStatsCalculatorTestFactory.create(
                        new EquipmentDataProvider(itemRepo, orbRepo, drifRepo),
                        new EquipmentRequestValidator(),
                        placement,
                        levels,
                        new DrifSecurityValidator(placement, levels),
                        itemProcessor,
                        new OrbStatProcessor(placement, levels, new OrbSecurityValidator()),
                        new DrifStatProcessor(placement, levels, rules, new DrifValueCalculator()),
                        new DrifCounter(placement),
                        new CalculationMetadataFactory(),
                        new SlotDrifSelectionFactory());
        return new OptimizationCalculatorFixture(
                OptimizationServiceTestFactory.create(
                        drifRepo,
                        itemRepo,
                        placement,
                        levels,
                        rules,
                        itemProcessor,
                        new OptimizationLockService(),
                        calculator),
                calculator);
    }

    static ItemTemplate item(long id, ITEM_CATEGORY category, String tier, int capacity) {
        return ItemTemplate.builder()
                .id(id)
                .name("Item " + id)
                .category(category)
                .tier(tier)
                .rarity(RARITY.RARE)
                .capacity(capacity)
                .stats(Map.of())
                .build();
    }

    static DrifTemplate drif(
            long id, DRIF_BONUS_TYPE type, DRIF_SIZE size, String base, String increment) {
        return DrifTemplate.builder()
                .id(id)
                .name(type.name())
                .bonusType(type)
                .size(size)
                .baseValue(base)
                .increment(increment)
                .build();
    }

    static EquipmentRequest.SlotData slot(long id, Long... drifs) {
        var slot = new EquipmentRequest.SlotData();
        slot.setItemId(id);
        slot.setItemStars(1);
        slot.setDrifIds(new ArrayList<>(Arrays.asList(drifs)));
        slot.setDrifLevels(new HashMap<>());
        return slot;
    }

    static OptimizationRequest request(
            Map<String, EquipmentRequest.SlotData> slots,
            Map<DRIF_BONUS_TYPE, Integer> priorities) {
        var request = new OptimizationRequest();
        request.setOriginalSlots(slots);
        request.setPriorities(priorities);
        request.setTargetQuantities(Map.of());
        request.setLockedSlots(Set.of());
        request.setLockedDrifs(Map.of());
        return request;
    }

    static double number(Map<String, String> stats, String key) {
        return Double.parseDouble(stats.getOrDefault(key, "0").replace("%", "").replace(",", "."));
    }
}
