package pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atMost;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_BONUS_TYPE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.DRIF_SIZE;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.ITEM_CATEGORY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.RARITY;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;
import pl.brokenranks.tool.broken_ranks_tool.equipment.service.EquipmentStatsCalculatorService;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationResponse;
import pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.*;

/** Built-in drifs, forced targets, caps, and warning scenarios. */
class CustomModsOptimizationConstraintTests extends CustomModsOptimizationTestSupport {
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
        weapon.setDrifLevels(Map.of("0", 1, "1", 6));
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
        assertEquals(Map.of("0", 16, "1", 16), result.getDrifLevels());
        assertEquals(0, response.getSummary().getTotalPowerUsed());

        request.setLockedSlots(Set.of("weapon"));
        OptimizationResponse lockedResponse = service.optimize(request);
        EquipmentRequest.SlotData lockedResult =
                lockedResponse.getOptimizedSetup().getSlots().get("weapon");
        assertEquals(Map.of("0", 1, "1", 6), lockedResult.getDrifLevels());
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
}
