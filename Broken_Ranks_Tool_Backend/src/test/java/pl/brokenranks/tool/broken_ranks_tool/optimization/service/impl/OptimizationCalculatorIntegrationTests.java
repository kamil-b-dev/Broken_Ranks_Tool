package pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl;

import static org.junit.jupiter.api.Assertions.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl.OptimizationCalculatorFixture.*;

import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.simpleprofile.*;

class OptimizationCalculatorIntegrationTests {
    @Test
    void simpleProfileIsOnlyAnAdvancedConfigurationOverlay() {
        var damage = drif(10, DRIF_BONUS_TYPE.DAMAGE_PHYSICAL, DRIF_SIZE.SUBDRIF, "5%", "1%");
        var reduction = drif(11, DRIF_BONUS_TYPE.DAMAGE_REDUCTION, DRIF_SIZE.SUBDRIF, "5%", "1%");
        var fixture =
                create(
                        List.of(
                                item(1, ITEM_CATEGORY.HELMET, "I", 4),
                                item(2, ITEM_CATEGORY.ARMOR, "I", 4),
                                item(3, ITEM_CATEGORY.BOOTS, "I", 4)),
                        List.of(damage, reduction),
                        List.of());
        Map<String, EquipmentRequest.SlotData> slots =
                Map.of("helmet", slot(1), "armor", slot(2), "boots", slot(3));
        var simple = request(slots, Map.of());
        simple.setConfigurationMode(BuildConfigurationMode.SIMPLE);
        simple.setSimpleProfile(SimpleBuildProfile.BARBARIAN);
        var options = new SimpleProfileOptions();
        options.setDamageDrifs(2);
        options.setAccuracyDrifs(2);
        options.setElement(SimpleElement.FIRE);
        simple.setSimpleOptions(options);

        var advanced = request(slots, Map.of());
        advanced.setConfigurationMode(BuildConfigurationMode.SIMPLE);
        advanced.setSimpleProfile(SimpleBuildProfile.BARBARIAN);
        advanced.setSimpleOptions(options);
        assertNull(SimpleProfileConfigurationResolver.resolve(advanced));
        advanced.setConfigurationMode(BuildConfigurationMode.ADVANCED);
        advanced.setSimpleProfile(null);
        advanced.setSimpleOptions(null);

        var simpleResponse = fixture.service().optimize(simple);
        var advancedResponse = fixture.service().optimize(advanced);

        assertEquals(advancedResponse.getOptimizedSetup(), simpleResponse.getOptimizedSetup());
        assertEquals(
                advancedResponse.getCalculationResult(), simpleResponse.getCalculationResult());
    }

    @Test
    void cappedModifierExcessLosesToAnotherUsefulModifier() {
        var reduction = drif(10, DRIF_BONUS_TYPE.DAMAGE_REDUCTION, DRIF_SIZE.SUBDRIF, "25%", "0%");
        var damage = drif(11, DRIF_BONUS_TYPE.DAMAGE_MAGIC, DRIF_SIZE.SUBDRIF, "10%", "0%");
        var fixture =
                create(
                        List.of(
                                item(1, ITEM_CATEGORY.HELMET, "I", 4),
                                item(2, ITEM_CATEGORY.ARMOR, "I", 4),
                                item(3, ITEM_CATEGORY.BOOTS, "I", 4)),
                        List.of(reduction, damage),
                        List.of());
        var request =
                request(
                        Map.of("helmet", slot(1), "armor", slot(2), "boots", slot(3)),
                        Map.of(
                                DRIF_BONUS_TYPE.DAMAGE_REDUCTION,
                                30,
                                DRIF_BONUS_TYPE.DAMAGE_MAGIC,
                                29));
        request.setMaximizeBonuses(
                Set.of(DRIF_BONUS_TYPE.DAMAGE_REDUCTION, DRIF_BONUS_TYPE.DAMAGE_MAGIC));

        var response = fixture.service().optimize(request);

        assertTrue(response.getSummary().isSuccess());
        assertTrue(number(response.getCalculationResult().stats(), "DAMAGE_REDUCTION") <= 50.0);
        assertTrue(number(response.getCalculationResult().stats(), "DAMAGE_MAGIC") > 0.0);
    }

    @Test
    void professionProfileReturnsWeakBuildAndReportsUnmetPreferredQuantities() {
        var damage = drif(10, DRIF_BONUS_TYPE.DAMAGE_PHYSICAL, DRIF_SIZE.SUBDRIF, "5%", "1%");
        var fixture =
                create(List.of(item(1, ITEM_CATEGORY.HELMET, "I", 4)), List.of(damage), List.of());
        var request = request(Map.of("helmet", slot(1)), Map.of());
        request.setConfigurationMode(BuildConfigurationMode.SIMPLE);
        request.setSimpleProfile(SimpleBuildProfile.BARBARIAN);
        var options = new SimpleProfileOptions();
        options.setDamageDrifs(3);
        options.setAccuracyDrifs(2);
        options.setElement(SimpleElement.FIRE);
        request.setSimpleOptions(options);

        var response = fixture.service().optimize(request);

        assertFalse(response.getOptimizedSetup().getSlots().isEmpty());
        assertTrue(
                response.getSummary().getWarnings().stream()
                        .anyMatch(warning -> warning.contains("Preferowana liczba drifów")));
    }

    @Test
    void simpleProfileDiversifiesLimitedSocketsInsteadOfChasingOneDistantGoal() {
        var damage = drif(10, DRIF_BONUS_TYPE.DAMAGE_PHYSICAL, DRIF_SIZE.SUBDRIF, "5%", "1%");
        var reduction = drif(11, DRIF_BONUS_TYPE.DAMAGE_REDUCTION, DRIF_SIZE.SUBDRIF, "5%", "1%");
        var fixture =
                create(
                        List.of(
                                item(1, ITEM_CATEGORY.HELMET, "I", 4),
                                item(2, ITEM_CATEGORY.ARMOR, "I", 4),
                                item(3, ITEM_CATEGORY.BOOTS, "I", 4),
                                item(4, ITEM_CATEGORY.CAPE, "I", 4)),
                        List.of(damage, reduction),
                        List.of());
        var request =
                request(
                        Map.of(
                                "helmet", slot(1),
                                "armor", slot(2),
                                "boots", slot(3),
                                "cape", slot(4)),
                        Map.of());
        request.setConfigurationMode(BuildConfigurationMode.SIMPLE);
        request.setSimpleProfile(SimpleBuildProfile.PHYSICAL_MELEE);
        request.setSimpleAspects(
                Map.of(
                        SimpleBuildAspect.DAMAGE,
                        SimpleAspectImportance.IMPORTANT,
                        SimpleBuildAspect.SURVIVABILITY,
                        SimpleAspectImportance.IMPORTANT));

        var response = fixture.service().optimize(request);

        assertTrue(
                response.getSummary().isSuccess(), response.getSummary().getWarnings().toString());
        var ids =
                response.getOptimizedSetup().getSlots().values().stream()
                        .flatMap(slot -> slot.getDrifIds().stream())
                        .filter(Objects::nonNull)
                        .toList();
        assertTrue(ids.contains(damage.getId()));
        assertTrue(ids.contains(reduction.getId()));
    }

    @Test
    void partialSizeConstraintStillAllowsLargerUnrestrictedDrifs() {
        var type = DRIF_BONUS_TYPE.CRITICAL_CHANCE;
        var sub = drif(10, type, DRIF_SIZE.SUBDRIF, "2%", "1%");
        var arcy = drif(11, type, DRIF_SIZE.ARCYDRIF, "2%", "1%");
        var fixture =
                create(
                        List.of(
                                item(1, ITEM_CATEGORY.HELMET, "XII", 20),
                                item(2, ITEM_CATEGORY.ARMOR, "XII", 20)),
                        List.of(sub, arcy),
                        List.of());
        var request = request(Map.of("helmet", slot(1), "armor", slot(2)), Map.of(type, 15));
        request.setTargetQuantities(Map.of(type, new OptimizationRequest.QuantityRange(2, 2)));
        request.setDrifSizeQuantities(
                Map.of(
                        type,
                        Map.of(DRIF_SIZE.SUBDRIF, new OptimizationRequest.QuantityRange(1, 1))));

        var response = fixture.service().optimize(request);

        assertTrue(response.getSummary().isSuccess());
        var ids =
                response.getOptimizedSetup().getSlots().values().stream()
                        .flatMap(slot -> slot.getDrifIds().stream())
                        .toList();
        assertEquals(1, ids.stream().filter(sub.getId()::equals).count());
        assertEquals(1, ids.stream().filter(arcy.getId()::equals).count());
    }

    @Test
    void honorsExactPerSizeQuantitiesInAdvancedBuildFromScratch() {
        var type = DRIF_BONUS_TYPE.CRITICAL_CHANCE;
        var drifs =
                List.of(
                        drif(10, type, DRIF_SIZE.SUBDRIF, "2%", "1%"),
                        drif(11, type, DRIF_SIZE.BIDRIF, "2%", "1%"),
                        drif(12, type, DRIF_SIZE.MAGNIDRIF, "2%", "1%"),
                        drif(13, type, DRIF_SIZE.ARCYDRIF, "2%", "1%"));
        var fixture =
                create(
                        List.of(
                                item(1, ITEM_CATEGORY.HELMET, "XII", 20),
                                item(2, ITEM_CATEGORY.ARMOR, "XII", 20),
                                item(3, ITEM_CATEGORY.BOOTS, "XII", 20),
                                item(4, ITEM_CATEGORY.CAPE, "XII", 20)),
                        drifs,
                        List.of());
        var request =
                request(
                        Map.of(
                                "helmet", slot(1),
                                "armor", slot(2),
                                "boots", slot(3),
                                "cape", slot(4)),
                        Map.of(type, 15));
        request.setConfigurationMode(BuildConfigurationMode.ADVANCED);
        request.setTargetQuantities(Map.of(type, new OptimizationRequest.QuantityRange(4, 4)));
        request.setDrifSizeQuantities(
                Map.of(
                        type,
                        Map.of(
                                DRIF_SIZE.SUBDRIF,
                                new OptimizationRequest.QuantityRange(1, 1),
                                DRIF_SIZE.BIDRIF,
                                new OptimizationRequest.QuantityRange(1, 1),
                                DRIF_SIZE.MAGNIDRIF,
                                new OptimizationRequest.QuantityRange(1, 1),
                                DRIF_SIZE.ARCYDRIF,
                                new OptimizationRequest.QuantityRange(1, 1))));

        var response = fixture.service().optimize(request);

        assertTrue(
                response.getSummary().isSuccess(), response.getSummary().getWarnings().toString());
        var sizes =
                response.getOptimizedSetup().getSlots().values().stream()
                        .flatMap(slot -> slot.getDrifIds().stream())
                        .map(
                                id ->
                                        drifs.stream()
                                                .filter(drif -> drif.getId().equals(id))
                                                .findFirst()
                                                .orElseThrow())
                        .map(DrifTemplate::getSize)
                        .collect(
                                java.util.stream.Collectors.groupingBy(
                                        size -> size, java.util.stream.Collectors.counting()));
        assertEquals(1L, sizes.get(DRIF_SIZE.SUBDRIF));
        assertEquals(1L, sizes.get(DRIF_SIZE.BIDRIF));
        assertEquals(1L, sizes.get(DRIF_SIZE.MAGNIDRIF));
        assertEquals(1L, sizes.get(DRIF_SIZE.ARCYDRIF));
    }

    @Test
    void identicalEquipmentAlwaysProducesIdenticalStarBonusDistribution() {
        var item = item(1, ITEM_CATEGORY.HELMET, "I", 4);
        item.setStats(Map.of("Siła", 10.0, "Moc", 10.0, "Wiedza", 10.0));
        var fixture = create(List.of(item), List.of(), List.of());
        var setup = new EquipmentRequest();
        var equipped = slot(1);
        equipped.setItemStars(9);
        setup.setSlots(Map.of("helmet", equipped));

        var first = fixture.calculator().calculateTotalStats(setup);
        var second = fixture.calculator().calculateTotalStats(setup);

        assertEquals(first, second);
        assertEquals(
                45, number(first, "Siła") + number(first, "Moc") + number(first, "Wiedza"), 1e-9);
    }

    @Test
    void rejectsDrifPlacedOutsideTheItemsPhysicalSockets() {
        var item = item(1, ITEM_CATEGORY.HELMET, "I", 20);
        var drif = drif(10, DRIF_BONUS_TYPE.CRITICAL_CHANCE, DRIF_SIZE.SUBDRIF, "2%", "1%");
        var fixture = create(List.of(item), List.of(drif), List.of());
        var invalidSlot = slot(1);
        invalidSlot.setDrifIds(Arrays.asList(null, 10L));
        invalidSlot.setDrifLevels(Map.of("1", 1));
        EquipmentRequest setup = new EquipmentRequest();
        setup.setSlots(Map.of("helmet", invalidSlot));

        assertThrows(
                IllegalArgumentException.class,
                () -> fixture.calculator().calculateTotalStats(setup));
    }

    @ParameterizedTest
    @CsvSource({
        "CRITICAL_CHANCE,2%,1%,9,9",
        "MANA_REGEN,2%,1%,12,12",
        "MANA_USAGE_REDUCTION,-2%,-1%,7,-7",
        "STAMINA_USAGE_REDUCTION,-2%,-1%,7,-7"
    })
    void targetAndSummaryAgreeWithRealCalculatorIncludingDefaultsAndNegativeDirection(
            DRIF_BONUS_TYPE type, String base, String increment, double target, double expected) {
        var item = item(1, ITEM_CATEGORY.HELMET, "I", 4);
        var drif = drif(10, type, DRIF_SIZE.SUBDRIF, base, increment);
        var fixture = create(List.of(item), List.of(drif), List.of());
        var request = request(Map.of("helmet", slot(1)), Map.of(type, 30));
        request.setForcedPercentageTargets(Map.of(type, target));
        request.setTargetQuantities(Map.of(type, new OptimizationRequest.QuantityRange(1, 1)));
        var response = fixture.service().optimize(request);
        assertTrue(
                response.getSummary().isSuccess(), response.getSummary().getWarnings().toString());
        var actual = fixture.calculator().calculateTotalStats(response.getOptimizedSetup());
        assertEquals(expected, number(actual, type.name()), 1e-9);
        var goal = response.getSummary().getGoalResults().getFirst();
        assertEquals(actual.get(type.name()), goal.calculatorValue());
        assertEquals(Boolean.TRUE, goal.targetSatisfied());
        assertTrue(goal.quantitySatisfied());
    }

    @Test
    void preservesCharacterStatsOrbsAndStarsThroughOptimizationAndCalculator() {
        var item = item(1, ITEM_CATEGORY.HELMET, "I", 4);
        item.setStats(Map.of("Siła", 10.0));
        var drif = drif(10, DRIF_BONUS_TYPE.CRITICAL_CHANCE, DRIF_SIZE.SUBDRIF, "2%", "1%");
        var orb =
                OrbTemplate.builder()
                        .id(20L)
                        .name("Defense")
                        .size(ORB_SIZE.SUBORB)
                        .category(ORB_CATEGORY.DEFENSIVE)
                        .bonusType(ORB_BONUS_TYPE.DMG_REDUCTION_MELEE)
                        .bonusLvl1("5%")
                        .build();
        var original = slot(1);
        original.setItemStars(9);
        original.setOrbIds(List.of(20L));
        original.setOrbLevels(List.of(1));
        var fixture = create(List.of(item), List.of(drif), List.of(orb));
        var request =
                request(Map.of("helmet", original), Map.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE, 30));
        request.setCharacterStats(new HashMap<>(Map.of("Siła", 101)));
        request.setForcedPercentageTargets(Map.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE, 10.05));
        var response = fixture.service().optimize(request);
        assertTrue(response.getSummary().isSuccess());
        var output = response.getOptimizedSetup();
        assertEquals(request.getCharacterStats(), output.getCharacterStats());
        for (var variant : response.getSummary().getNextVariants()) {
            assertEquals(request.getCharacterStats(), variant.setup().getCharacterStats());
        }
        var slot = output.getSlots().get("helmet");
        assertEquals(9, slot.getItemStars());
        assertEquals(List.of(20L), slot.getOrbIds());
        assertEquals(List.of(1), slot.getOrbLevels());
        var actual = fixture.calculator().calculateTotalStats(output);
        assertEquals(actual, response.getCalculationResult().stats());
        assertNotNull(response.getCalculationResult().drifCategories());
        assertNotNull(response.getCalculationResult().orbBonusTypes());
        assertEquals(116, number(actual, "Siła"), 1e-9);
        assertEquals(8.75, number(actual, ORB_BONUS_TYPE.DMG_REDUCTION_MELEE.name()), 1e-9);
        assertEquals(10.05, number(actual, DRIF_BONUS_TYPE.CRITICAL_CHANCE.name()), 1e-9);
        output.getCharacterStats().put("Siła", 1);
        assertEquals(
                101, request.getCharacterStats().get("Siła"), "Result must not alias request data");
        assertTrue(original.getDrifIds().isEmpty());
    }

    @Test
    void builtInDrifParticipatesInGlobalPenaltyWhileEpicSlotIsMaximized() {
        var type = DRIF_BONUS_TYPE.CRITICAL_CHANCE;
        var normal = drif(10, type, DRIF_SIZE.SUBDRIF, "2%", "1%");
        var builtin = drif(11, type, DRIF_SIZE.MAGNIDRIF, "2%", "1%");
        var secondBuiltin =
                drif(12, DRIF_BONUS_TYPE.HIT_CHANCE_MELEE, DRIF_SIZE.MAGNIDRIF, "1%", "1%");
        var epic = item(4, ITEM_CATEGORY.WEAPON_1H, "VII", 0);
        epic.setName("Washi");
        epic.setRarity(RARITY.EPIC);
        var epicSlot = slot(4, 11L, 12L);
        epicSlot.setDrifLevels(Map.of("0", 1, "1", 1));
        var fixture =
                create(
                        List.of(
                                item(1, ITEM_CATEGORY.HELMET, "I", 4),
                                item(2, ITEM_CATEGORY.ARMOR, "I", 4),
                                item(3, ITEM_CATEGORY.BOOTS, "I", 4),
                                epic),
                        List.of(normal, builtin, secondBuiltin),
                        List.of());
        var request =
                request(
                        Map.of(
                                "helmet", slot(1), "armor", slot(2), "boots", slot(3), "weapon",
                                epicSlot),
                        Map.of(type, 30));
        request.setTargetQuantities(Map.of(type, new OptimizationRequest.QuantityRange(4, 4)));
        request.setForcedPercentageTargets(Map.of(type, 23.85));
        var response = fixture.service().optimize(request);
        assertTrue(
                response.getSummary().isSuccess(), response.getSummary().getWarnings().toString());
        var optimizedEpic = response.getOptimizedSetup().getSlots().get("weapon");
        assertEquals(epicSlot.getDrifIds(), optimizedEpic.getDrifIds());
        assertEquals(Map.of("0", 16, "1", 16), optimizedEpic.getDrifLevels());
        // The built-in drif is raised from level 1 to 16 before global penalties are applied.
        assertEquals(
                38.1,
                number(
                        fixture.calculator().calculateTotalStats(response.getOptimizedSetup()),
                        type.name()),
                1e-9);
        assertEquals(12, response.getSummary().getTotalPowerUsed());
        assertEquals(5, response.getSummary().getDrifsPlaced());
    }

    @Test
    void impossibleCompetingTargetsReturnHonestCalculatorVerifiedWarnings() {
        var a = DRIF_BONUS_TYPE.CRITICAL_CHANCE;
        var b = DRIF_BONUS_TYPE.MANA_REGEN;
        var fixture =
                create(
                        List.of(item(1, ITEM_CATEGORY.HELMET, "I", 4)),
                        List.of(
                                drif(10, a, DRIF_SIZE.SUBDRIF, "2%", "1%"),
                                drif(11, b, DRIF_SIZE.SUBDRIF, "2%", "1%")),
                        List.of());
        var request = request(Map.of("helmet", slot(1)), Map.of(a, 30, b, 10));
        request.setForcedPercentageTargets(Map.of(a, 9.0, b, 12.0));
        var response = fixture.service().optimize(request);
        assertFalse(response.getSummary().isSuccess());
        assertFalse(response.getSummary().getWarnings().isEmpty());
        var actual = fixture.calculator().calculateTotalStats(response.getOptimizedSetup());
        for (var goal : response.getSummary().getGoalResults()) {
            assertEquals(actual.get(goal.statKey()), goal.calculatorValue());
            double target =
                    request.getForcedPercentageTargets()
                            .get(DRIF_BONUS_TYPE.valueOf(goal.statKey()));
            assertEquals(number(actual, goal.statKey()) >= target - 0.5, goal.targetSatisfied());
        }
    }
}
