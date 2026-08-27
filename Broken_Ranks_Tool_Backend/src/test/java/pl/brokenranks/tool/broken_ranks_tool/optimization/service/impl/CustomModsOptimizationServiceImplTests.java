package pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.atMost;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.*;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
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
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.EquipmentPlacementRules;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.validator.UpgradeLevelPolicy;
import pl.brokenranks.tool.broken_ranks_tool.optimization.constraints.OptimizationLockService;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationResponse;

class CustomModsOptimizationServiceImplTests {

    @Test
    void preservesBuiltInDrifsOnEpicItemWithoutTreatingThemAsCapacityUsage() {
        ItemTemplate epic =
                ItemTemplate.builder()
                        .id(168L)
                        .name("Żmij")
                        .category(ITEM_CATEGORY.WEAPON_2H)
                        .tier("IX")
                        .rarity(RARITY.EPIC)
                        .capacity(null)
                        .stats(Map.of())
                        .build();
        DrifTemplate criticalChance =
                DrifTemplate.builder()
                        .id(83L)
                        .name("Band")
                        .size(DRIF_SIZE.MAGNIDRIF)
                        .bonusType(DRIF_BONUS_TYPE.CRITICAL_CHANCE)
                        .baseValue("2%")
                        .increment("0.5%")
                        .build();
        DrifTemplate doubleAttack =
                DrifTemplate.builder()
                        .id(91L)
                        .name("Teld")
                        .size(DRIF_SIZE.MAGNIDRIF)
                        .bonusType(DRIF_BONUS_TYPE.DOUBLE_ATTACK_CHANCE)
                        .baseValue("2%")
                        .increment("0.5%")
                        .build();
        EquipmentStatsCalculatorService calculator = mock(EquipmentStatsCalculatorService.class);
        when(calculator.calculateTotalStats(any()))
                .thenReturn(
                        Map.of(
                                DRIF_BONUS_TYPE.CRITICAL_CHANCE.name(), "12%",
                                DRIF_BONUS_TYPE.DOUBLE_ATTACK_CHANCE.name(), "12%"));
        CustomModsOptimizationServiceImpl service =
                service(epic, List.of(criticalChance, doubleAttack), calculator);

        EquipmentRequest.SlotData weapon = slot(epic.getId());
        weapon.setDrifIds(List.of(criticalChance.getId(), doubleAttack.getId()));
        weapon.setDrifLevels(Map.of("0", 21, "1", 21));
        OptimizationRequest request = new OptimizationRequest();
        request.setOriginalSlots(Map.of("weapon", weapon));
        request.setPriorities(Map.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE, 20));
        request.setTargetQuantities(Map.of());
        request.setLockedSlots(Set.of());
        request.setLockedDrifs(Map.of());
        request.setForceCapBonuses(Set.of());
        request.setMaximizeBonuses(Set.of());

        OptimizationResponse response = service.optimize(request);

        assertTrue(response.getSummary().isSuccess());
        EquipmentRequest.SlotData result = response.getOptimizedSetup().getSlots().get("weapon");
        assertEquals(List.of(criticalChance.getId(), doubleAttack.getId()), result.getDrifIds());
        assertEquals(Map.of("0", 21, "1", 21), result.getDrifLevels());
        assertEquals(0, response.getSummary().getTotalPowerUsed());
    }

    @Test
    void keepsHighestCapacityLevelAfterForcedCapIsReached() {
        ItemTemplate item = item(1L, 12);
        DrifTemplate criticalChance = drif(10L, DRIF_BONUS_TYPE.CRITICAL_CHANCE, 2.0, 4.0);
        EquipmentStatsCalculatorService calculator = mock(EquipmentStatsCalculatorService.class);
        when(calculator.calculateTotalStats(any()))
                .thenAnswer(
                        invocation -> {
                            EquipmentRequest setup = invocation.getArgument(0);
                            EquipmentRequest.SlotData slot = setup.getSlots().get("helmet");
                            double value = 2.0;
                            if (slot.getDrifIds() != null && !slot.getDrifIds().isEmpty()) {
                                int level = slot.getDrifLevels().getOrDefault("0", 1);
                                value += 2.0 + Math.max(0, level - 1) * 4.0;
                            }
                            return Map.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE.name(), value + "%");
                        });

        CustomModsOptimizationServiceImpl service =
                service(item, List.of(criticalChance), calculator);
        OptimizationRequest request =
                request(item.getId(), Map.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE, 30));
        request.setForceCapBonuses(Set.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE));

        OptimizationResponse response = service.optimize(request);

        assertTrue(response.getSummary().isSuccess());
        EquipmentRequest.SlotData result = response.getOptimizedSetup().getSlots().get("helmet");
        assertEquals(List.of(criticalChance.getId()), result.getDrifIds());
        assertEquals(16, result.getDrifLevels().get("0"));
        assertEquals(
                "Test XII",
                response.getSummary().getItemsByDrifBonus().get(0.0).getFirst().itemName());
        assertEquals(
                "helmet",
                response.getSummary().getItemsByDrifBonus().get(0.0).getFirst().slotKey());
        assertTrue(response.getSummary().getNextVariants().getFirst().main());
        assertEquals(
                result.getDrifIds(),
                response.getSummary()
                        .getNextVariants()
                        .getFirst()
                        .setup()
                        .getSlots()
                        .get("helmet")
                        .getDrifIds());
        verify(calculator, atMost(4)).calculateTotalStats(any());
    }

    @Test
    void reachesUserDefinedPercentageUsingForcedCapLevelStrategy() {
        ItemTemplate item = item(1L, 12);
        DrifTemplate criticalChance = drif(10L, DRIF_BONUS_TYPE.CRITICAL_CHANCE, 2.0, 4.0);
        EquipmentStatsCalculatorService calculator = mock(EquipmentStatsCalculatorService.class);
        when(calculator.calculateTotalStats(any()))
                .thenAnswer(
                        invocation -> {
                            EquipmentRequest setup = invocation.getArgument(0);
                            EquipmentRequest.SlotData slot = setup.getSlots().get("helmet");
                            if (slot.getDrifIds() == null || slot.getDrifIds().isEmpty()) {
                                return Map.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE.name(), "0%");
                            }
                            int level = slot.getDrifLevels().getOrDefault("0", 1);
                            double value = 2.0 + Math.max(0, level - 1) * 4.0;
                            return Map.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE.name(), value + "%");
                        });

        CustomModsOptimizationServiceImpl service =
                service(item, List.of(criticalChance), calculator);
        OptimizationRequest request =
                request(item.getId(), Map.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE, 30));
        request.setForcedPercentageTargets(Map.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE, 30.0));

        OptimizationResponse response = service.optimize(request);

        assertTrue(response.getSummary().isSuccess());
        EquipmentRequest.SlotData result = response.getOptimizedSetup().getSlots().get("helmet");
        assertEquals(List.of(criticalChance.getId()), result.getDrifIds());
        assertEquals(16, result.getDrifLevels().get("0"));
    }

    @Test
    void rejectsCapAndPercentageTargetForTheSameBonus() {
        ItemTemplate item = item(1L, 12);
        DrifTemplate criticalChance = drif(10L, DRIF_BONUS_TYPE.CRITICAL_CHANCE, 2.0, 4.0);
        CustomModsOptimizationServiceImpl service =
                service(item, List.of(criticalChance), mock(EquipmentStatsCalculatorService.class));
        OptimizationRequest request =
                request(item.getId(), Map.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE, 30));
        request.setForceCapBonuses(Set.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE));
        request.setForcedPercentageTargets(Map.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE, 30.0));

        OptimizationResponse response = service.optimize(request);

        assertFalse(response.getSummary().isSuccess());
        assertTrue(
                response.getSummary()
                        .getMessage()
                        .contains("Nie można jednocześnie wymusić capa i własnego procentu"));
    }

    @Test
    void returnsBestBuildWithWarningWhenForcedCapCannotBeReached() {
        ItemTemplate item = item(1L, 4);
        DrifTemplate criticalChance = drif(10L, DRIF_BONUS_TYPE.CRITICAL_CHANCE, 2.0, 4.0);
        EquipmentStatsCalculatorService calculator = mock(EquipmentStatsCalculatorService.class);
        when(calculator.calculateTotalStats(any()))
                .thenReturn(Map.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE.name(), "10%"));

        CustomModsOptimizationServiceImpl service =
                service(item, List.of(criticalChance), calculator);
        OptimizationRequest request =
                request(item.getId(), Map.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE, 30));
        request.setForceCapBonuses(Set.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE));

        OptimizationResponse response = service.optimize(request);

        assertFalse(response.getSummary().isSuccess());
        assertTrue(
                response.getSummary()
                        .getMessage()
                        .contains("Nie udało się osiągnąć docelowego capa"));
        assertNotNull(response.getOptimizedSetup());
        EquipmentRequest.SlotData result = response.getOptimizedSetup().getSlots().get("helmet");
        assertEquals(List.of(criticalChance.getId()), result.getDrifIds());
    }

    @Test
    void reportsEveryForcedCapThatCannotBeReached() {
        ItemTemplate item = item(1L, 8);
        DrifTemplate criticalChance = drif(10L, DRIF_BONUS_TYPE.CRITICAL_CHANCE, 2.0, 4.0);
        DrifTemplate ccProtection = drif(11L, DRIF_BONUS_TYPE.CC_PROTECTION, 2.0, 4.0);
        EquipmentStatsCalculatorService calculator = mock(EquipmentStatsCalculatorService.class);
        when(calculator.calculateTotalStats(any()))
                .thenReturn(
                        Map.of(
                                DRIF_BONUS_TYPE.CRITICAL_CHANCE.name(), "0%",
                                DRIF_BONUS_TYPE.CC_PROTECTION.name(), "0%"));

        CustomModsOptimizationServiceImpl service =
                service(item, List.of(criticalChance, ccProtection), calculator);
        OptimizationRequest request =
                request(
                        item.getId(),
                        Map.of(
                                DRIF_BONUS_TYPE.CRITICAL_CHANCE, 30,
                                DRIF_BONUS_TYPE.CC_PROTECTION, 20));
        request.setForceCapBonuses(
                Set.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE, DRIF_BONUS_TYPE.CC_PROTECTION));

        OptimizationResponse response = service.optimize(request);

        assertFalse(response.getSummary().isSuccess());
        assertEquals(2, response.getSummary().getWarnings().size());
        assertTrue(
                response.getSummary().getWarnings().stream()
                        .anyMatch(message -> message.contains("Szansa kryt")));
        assertTrue(
                response.getSummary().getWarnings().stream()
                        .anyMatch(message -> message.contains("Odpornosc cc")));
    }

    @Test
    void allocatesHigherPowerTierToHigherPriorityDrif() {
        ItemTemplate item = item(1L, 12);
        DrifTemplate magicDamage = drif(10L, DRIF_BONUS_TYPE.DAMAGE_MAGIC, 2.0, 2.0);
        DrifTemplate rangedHit = drif(11L, DRIF_BONUS_TYPE.HIT_CHANCE_RANGED, 2.0, 2.0);
        EquipmentStatsCalculatorService calculator = mock(EquipmentStatsCalculatorService.class);
        when(calculator.calculateTotalStats(any())).thenReturn(Map.of());

        CustomModsOptimizationServiceImpl service =
                service(item, List.of(magicDamage, rangedHit), calculator);
        Map<DRIF_BONUS_TYPE, Integer> priorities = new LinkedHashMap<>();
        priorities.put(DRIF_BONUS_TYPE.DAMAGE_MAGIC, 30);
        priorities.put(DRIF_BONUS_TYPE.HIT_CHANCE_RANGED, 10);

        OptimizationRequest request = request(item.getId(), priorities);
        request.setTargetQuantities(
                Map.of(
                        DRIF_BONUS_TYPE.DAMAGE_MAGIC, new OptimizationRequest.QuantityRange(1, 12),
                        DRIF_BONUS_TYPE.HIT_CHANCE_RANGED,
                                new OptimizationRequest.QuantityRange(1, 12)));
        OptimizationResponse response = service.optimize(request);

        assertTrue(response.getSummary().isSuccess());
        EquipmentRequest.SlotData result = response.getOptimizedSetup().getSlots().get("helmet");
        Map<Long, Integer> levelsById = new HashMap<>();
        for (int index = 0; index < result.getDrifIds().size(); index++) {
            levelsById.put(
                    result.getDrifIds().get(index),
                    result.getDrifLevels().get(String.valueOf(index)));
        }
        assertEquals(16, levelsById.get(magicDamage.getId()));
        assertEquals(6, levelsById.get(rangedHit.getId()));

        OptimizationResponse repeated = service.optimize(request);
        assertEquals(
                response.getOptimizedSetup().getSlots(), repeated.getOptimizedSetup().getSlots());
    }

    @Test
    void preservesDrifsLockedByForcedBonusMaximizationThroughAllStages() {
        ItemTemplate item = item(1L, 24);
        DrifTemplate magic = drif(10L, DRIF_BONUS_TYPE.DAMAGE_MAGIC, 2.0, 1.0);
        DrifTemplate ranged = drif(11L, DRIF_BONUS_TYPE.HIT_CHANCE_RANGED, 2.0, 1.0);
        EquipmentStatsCalculatorService calculator = mock(EquipmentStatsCalculatorService.class);
        when(calculator.calculateTotalStats(any()))
                .thenReturn(
                        Map.of(
                                DRIF_BONUS_TYPE.DAMAGE_MAGIC.name(), "10%",
                                DRIF_BONUS_TYPE.HIT_CHANCE_RANGED.name(), "10%"));
        CustomModsOptimizationServiceImpl service =
                service(item, List.of(magic, ranged), calculator);
        Map<DRIF_BONUS_TYPE, Integer> priorities = new LinkedHashMap<>();
        priorities.put(DRIF_BONUS_TYPE.DAMAGE_MAGIC, 30);
        priorities.put(DRIF_BONUS_TYPE.HIT_CHANCE_RANGED, 20);
        OptimizationRequest request = request(item.getId(), priorities);
        request.setTargetQuantities(
                Map.of(
                        DRIF_BONUS_TYPE.DAMAGE_MAGIC, new OptimizationRequest.QuantityRange(1, 1),
                        DRIF_BONUS_TYPE.HIT_CHANCE_RANGED,
                                new OptimizationRequest.QuantityRange(1, 1)));
        request.setMaximizeBonuses(
                Set.of(DRIF_BONUS_TYPE.DAMAGE_MAGIC, DRIF_BONUS_TYPE.HIT_CHANCE_RANGED));
        request.setForceMaximizationByDrifBonus(true);

        OptimizationResponse response = service.optimize(request);

        EquipmentRequest.SlotData result = response.getOptimizedSetup().getSlots().get("helmet");
        assertEquals(List.of(magic.getId(), ranged.getId()), result.getDrifIds());
        assertEquals(21, result.getDrifLevels().get("0"));
        assertEquals(21, result.getDrifLevels().get("1"));
    }

    @Test
    void countsUserLockedDrifTowardPrelockedMinimum() {
        ItemTemplate helmet = item(1L, 12, ITEM_CATEGORY.HELMET);
        ItemTemplate armor = item(2L, 12, ITEM_CATEGORY.ARMOR);
        DrifTemplate magic = drif(10L, DRIF_BONUS_TYPE.DAMAGE_MAGIC, 2.0, 1.0);
        EquipmentStatsCalculatorService calculator = mock(EquipmentStatsCalculatorService.class);
        when(calculator.calculateTotalStats(any()))
                .thenReturn(Map.of(DRIF_BONUS_TYPE.DAMAGE_MAGIC.name(), "10%"));
        CustomModsOptimizationServiceImpl service =
                service(
                        List.of(helmet, armor),
                        List.of(magic),
                        calculator,
                        Map.of(helmet.getId(), 0.0, armor.getId(), 0.75));
        EquipmentRequest.SlotData lockedHelmet = slot(helmet.getId());
        lockedHelmet.setDrifIds(List.of(magic.getId()));
        lockedHelmet.setDrifLevels(Map.of("0", 21));
        OptimizationRequest request = new OptimizationRequest();
        request.setOriginalSlots(Map.of("helmet", lockedHelmet, "armor", slot(armor.getId())));
        request.setPriorities(Map.of(DRIF_BONUS_TYPE.DAMAGE_MAGIC, 30));
        request.setTargetQuantities(
                Map.of(DRIF_BONUS_TYPE.DAMAGE_MAGIC, new OptimizationRequest.QuantityRange(2, 2)));
        request.setLockedSlots(Set.of());
        request.setLockedDrifs(Map.of("helmet", Set.of(0)));
        request.setForceCapBonuses(Set.of());
        request.setMaximizeBonuses(Set.of(DRIF_BONUS_TYPE.DAMAGE_MAGIC));
        request.setForceMaximizationByDrifBonus(true);

        OptimizationResponse response = service.optimize(request);

        long magicCount =
                response.getOptimizedSetup().getSlots().values().stream()
                        .flatMap(slot -> slot.getDrifIds().stream())
                        .filter(magic.getId()::equals)
                        .count();
        assertEquals(2, magicCount);
        assertEquals(
                magic.getId(),
                response.getOptimizedSetup().getSlots().get("helmet").getDrifIds().getFirst());
        assertEquals(
                magic.getId(),
                response.getOptimizedSetup().getSlots().get("armor").getDrifIds().getFirst());
    }

    @Test
    void preservesLocksAndMinimumsWithDeterministicResult() {
        ItemTemplate helmet = item(1L, 12, ITEM_CATEGORY.HELMET);
        ItemTemplate armor = item(2L, 12, ITEM_CATEGORY.ARMOR);
        DrifTemplate magicDamage = drif(10L, DRIF_BONUS_TYPE.DAMAGE_MAGIC, 2.0, 2.0);
        DrifTemplate rangedHit = drif(11L, DRIF_BONUS_TYPE.HIT_CHANCE_RANGED, 2.0, 2.0);
        DrifTemplate criticalChance = drif(12L, DRIF_BONUS_TYPE.CRITICAL_CHANCE, 2.0, 2.0);
        EquipmentStatsCalculatorService calculator = mock(EquipmentStatsCalculatorService.class);
        when(calculator.calculateTotalStats(any())).thenReturn(Map.of());

        CustomModsOptimizationServiceImpl service =
                service(
                        List.of(helmet, armor),
                        List.of(magicDamage, rangedHit, criticalChance),
                        calculator);
        Map<DRIF_BONUS_TYPE, Integer> priorities = new LinkedHashMap<>();
        priorities.put(DRIF_BONUS_TYPE.DAMAGE_MAGIC, 30);
        priorities.put(DRIF_BONUS_TYPE.HIT_CHANCE_RANGED, 20);
        priorities.put(DRIF_BONUS_TYPE.CRITICAL_CHANCE, 10);

        OptimizationRequest request = request(helmet.getId(), priorities);
        EquipmentRequest.SlotData lockedHelmet = request.getOriginalSlots().get("helmet");
        lockedHelmet.setDrifIds(List.of(criticalChance.getId()));
        lockedHelmet.setDrifLevels(Map.of("0", 11));
        EquipmentRequest.SlotData emptyArmor = slot(armor.getId());
        request.setOriginalSlots(
                new LinkedHashMap<>(
                        Map.of(
                                "helmet", lockedHelmet,
                                "armor", emptyArmor)));
        request.setLockedDrifs(Map.of("helmet", Set.of(0)));
        request.setTargetQuantities(
                Map.of(
                        DRIF_BONUS_TYPE.DAMAGE_MAGIC, new OptimizationRequest.QuantityRange(1, 2),
                        DRIF_BONUS_TYPE.HIT_CHANCE_RANGED,
                                new OptimizationRequest.QuantityRange(1, 2),
                        DRIF_BONUS_TYPE.CRITICAL_CHANCE,
                                new OptimizationRequest.QuantityRange(1, 2)));

        OptimizationResponse response = service.optimize(request);
        OptimizationResponse repeated = service.optimize(request);

        assertTrue(response.getSummary().isSuccess());
        EquipmentRequest.SlotData resultHelmet =
                response.getOptimizedSetup().getSlots().get("helmet");
        assertEquals(criticalChance.getId(), resultHelmet.getDrifIds().get(0));
        assertEquals(11, resultHelmet.getDrifLevels().get("0"));

        Map<Long, DRIF_BONUS_TYPE> typesById =
                List.of(magicDamage, rangedHit, criticalChance).stream()
                        .collect(Collectors.toMap(DrifTemplate::getId, DrifTemplate::getBonusType));
        Map<DRIF_BONUS_TYPE, Long> counts =
                response.getOptimizedSetup().getSlots().values().stream()
                        .flatMap(slot -> slot.getDrifIds().stream())
                        .filter(java.util.Objects::nonNull)
                        .collect(Collectors.groupingBy(typesById::get, Collectors.counting()));
        assertTrue(counts.getOrDefault(DRIF_BONUS_TYPE.DAMAGE_MAGIC, 0L) >= 1);
        assertTrue(counts.getOrDefault(DRIF_BONUS_TYPE.HIT_CHANCE_RANGED, 0L) >= 1);
        assertTrue(counts.getOrDefault(DRIF_BONUS_TYPE.CRITICAL_CHANCE, 0L) >= 1);
        assertEquals(
                response.getOptimizedSetup().getSlots(), repeated.getOptimizedSetup().getSlots());
    }

    @Test
    void keepsOnlyOneElementalDamageTypeAcrossSetup() {
        ItemTemplate item = item(1L, 12, ITEM_CATEGORY.WEAPON_2H);
        DrifTemplate fire = drif(10L, DRIF_BONUS_TYPE.DAMAGE_FIRE, 2.0, 2.0);
        DrifTemplate energy = drif(11L, DRIF_BONUS_TYPE.DAMAGE_ENERGY, 2.0, 2.0);
        EquipmentStatsCalculatorService calculator = mock(EquipmentStatsCalculatorService.class);
        when(calculator.calculateTotalStats(any())).thenReturn(Map.of());
        CustomModsOptimizationServiceImpl service =
                service(item, List.of(fire, energy), calculator);

        Map<DRIF_BONUS_TYPE, Integer> priorities = new LinkedHashMap<>();
        priorities.put(DRIF_BONUS_TYPE.DAMAGE_FIRE, 30);
        priorities.put(DRIF_BONUS_TYPE.DAMAGE_ENERGY, 20);
        OptimizationRequest request = request(item.getId(), priorities);
        request.setOriginalSlots(Map.of("weapon", slot(item.getId())));
        OptimizationResponse response = service.optimize(request);

        assertTrue(response.getSummary().isSuccess());
        long elementalCount =
                response.getOptimizedSetup().getSlots().get("weapon").getDrifIds().stream()
                        .filter(java.util.Objects::nonNull)
                        .count();
        assertEquals(1, elementalCount);
    }

    @Test
    void maximizesSelectedModOnItemWithHighestDrifBonusBeforeHigherRawGainSlots() {
        ItemTemplate helmet = item(1L, 4, ITEM_CATEGORY.HELMET);
        ItemTemplate armor = item(2L, 16, ITEM_CATEGORY.ARMOR);
        DrifTemplate criticalChance = drif(10L, DRIF_BONUS_TYPE.CRITICAL_CHANCE, 2.0, 4.0);
        EquipmentStatsCalculatorService calculator = mock(EquipmentStatsCalculatorService.class);
        when(calculator.calculateTotalStats(any())).thenReturn(Map.of());

        CustomModsOptimizationServiceImpl service =
                service(
                        List.of(helmet, armor),
                        List.of(criticalChance),
                        calculator,
                        Map.of(helmet.getId(), 0.20, armor.getId(), 0.0));
        OptimizationRequest request =
                request(helmet.getId(), Map.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE, 15));
        request.setOriginalSlots(
                Map.of(
                        "helmet", slot(helmet.getId()),
                        "armor", slot(armor.getId())));
        request.setTargetQuantities(
                Map.of(
                        DRIF_BONUS_TYPE.CRITICAL_CHANCE,
                        new OptimizationRequest.QuantityRange(0, 2)));
        request.setMaximizeBonuses(Set.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE));

        OptimizationResponse response = service.optimize(request);

        assertTrue(response.getSummary().isSuccess());
        assertEquals(
                List.of(criticalChance.getId()),
                response.getOptimizedSetup().getSlots().get("helmet").getDrifIds());
        assertEquals(
                List.of(criticalChance.getId()),
                response.getOptimizedSetup().getSlots().get("armor").getDrifIds());
    }

    @Test
    void replacesLowerPriorityModWhenMaximizedModImprovesFinalValue() {
        ItemTemplate item = item(1L, 6);
        DrifTemplate mentalDefense = drif(10L, DRIF_BONUS_TYPE.DEFENSE_MENTAL, 9.0, 1.5);
        DrifTemplate magicDamage = drif(11L, DRIF_BONUS_TYPE.DAMAGE_MAGIC, 3.0, 0.5);
        EquipmentStatsCalculatorService calculator = mock(EquipmentStatsCalculatorService.class);
        when(calculator.calculateTotalStats(any())).thenReturn(Map.of());
        CustomModsOptimizationServiceImpl service =
                service(item, List.of(mentalDefense, magicDamage), calculator);

        OptimizationRequest request =
                request(
                        item.getId(),
                        Map.of(
                                DRIF_BONUS_TYPE.DAMAGE_MAGIC, 30,
                                DRIF_BONUS_TYPE.DEFENSE_MENTAL, 5));
        request.setTargetQuantities(
                Map.of(
                        DRIF_BONUS_TYPE.DAMAGE_MAGIC, new OptimizationRequest.QuantityRange(0, 1),
                        DRIF_BONUS_TYPE.DEFENSE_MENTAL,
                                new OptimizationRequest.QuantityRange(0, 12)));
        request.setMaximizeBonuses(Set.of(DRIF_BONUS_TYPE.DAMAGE_MAGIC));

        EquipmentRequest.SlotData original = request.getOriginalSlots().get("helmet");
        SlotContext slot =
                new SlotContext(
                        "helmet",
                        original,
                        item,
                        6,
                        3,
                        0.0,
                        new ArrayList<>(List.of(magicDamage, mentalDefense)),
                        Set.of(),
                        false);
        OptimizationContext context =
                new OptimizationContext(
                        request,
                        Map.of(item.getId(), item),
                        Map.of(
                                mentalDefense.getId(),
                                mentalDefense,
                                magicDamage.getId(),
                                magicDamage),
                        List.of(slot),
                        Map.of(0.0, List.of(slot)),
                        request.getPriorities().entrySet().stream().toList(),
                        request.getTargetQuantities().entrySet().stream().toList(),
                        new SearchBudget(10),
                        new SearchBudget(100),
                        new SearchBudget(10),
                        new EnumMap<>(DRIF_BONUS_TYPE.class),
                        new EnumMap<>(DRIF_BONUS_TYPE.class),
                        new HashMap<>(),
                        new HashMap<>(),
                        new HashMap<>());
        BuildState state = new BuildState();
        List<Placement> placements = new ArrayList<>();
        placements.add(new Placement(mentalDefense, 21, false));
        placements.add(null);
        placements.add(null);
        state.slots().put("helmet", placements);

        BuildState result = service.maximizeSelectedBonuses(state, context);

        Placement replacement = result.slots().get("helmet").get(0);
        assertEquals(magicDamage.getId(), replacement.drif().getId());
        assertEquals(11, replacement.level());
    }

    private CustomModsOptimizationServiceImpl service(
            ItemTemplate item,
            List<DrifTemplate> drifs,
            EquipmentStatsCalculatorService calculator) {
        return service(List.of(item), drifs, calculator);
    }

    private CustomModsOptimizationServiceImpl service(
            List<ItemTemplate> items,
            List<DrifTemplate> drifs,
            EquipmentStatsCalculatorService calculator) {
        return service(items, drifs, calculator, Map.of());
    }

    private CustomModsOptimizationServiceImpl service(
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
        return new CustomModsOptimizationServiceImpl(
                drifRepository,
                itemRepository,
                placementRules,
                new UpgradeLevelPolicy(),
                rules,
                itemStatProcessor,
                new OptimizationLockService(),
                calculator);
    }

    private OptimizationRequest request(Long itemId, Map<DRIF_BONUS_TYPE, Integer> priorities) {
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

    private EquipmentRequest.SlotData slot(Long itemId) {
        EquipmentRequest.SlotData slot = new EquipmentRequest.SlotData();
        slot.setItemId(itemId);
        slot.setItemStars(1);
        slot.setDrifIds(List.of());
        slot.setDrifLevels(new HashMap<>());
        return slot;
    }

    private ItemTemplate item(Long id, int capacity) {
        return item(id, capacity, ITEM_CATEGORY.HELMET);
    }

    private ItemTemplate item(Long id, int capacity, ITEM_CATEGORY category) {
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
