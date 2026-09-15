package pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl;

import static org.junit.jupiter.api.Assertions.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl.OptimizationCalculatorFixture.*;

import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.*;

class OptimizationCalculatorIntegrationTests {
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
    void builtInDrifParticipatesInGlobalPenaltyWhileEpicSlotRemainsUnchanged() {
        var type = DRIF_BONUS_TYPE.CRITICAL_CHANCE;
        var normal = drif(10, type, DRIF_SIZE.SUBDRIF, "2%", "1%");
        var builtin = drif(11, type, DRIF_SIZE.MAGNIDRIF, "2%", "1%");
        var epic = item(4, ITEM_CATEGORY.WEAPON_1H, "VII", 0);
        epic.setName("Washi");
        epic.setRarity(RARITY.EPIC);
        var epicSlot = slot(4, 11L);
        epicSlot.setDrifLevels(Map.of("0", 1));
        var fixture =
                create(
                        List.of(
                                item(1, ITEM_CATEGORY.HELMET, "I", 4),
                                item(2, ITEM_CATEGORY.ARMOR, "I", 4),
                                item(3, ITEM_CATEGORY.BOOTS, "I", 4),
                                epic),
                        List.of(normal, builtin),
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
        assertEquals(epicSlot, response.getOptimizedSetup().getSlots().get("weapon"));
        // Three ordinary 7% drifs and one built-in 2% drif: 23 * .95 + default 2%.
        assertEquals(
                23.85,
                number(
                        fixture.calculator().calculateTotalStats(response.getOptimizedSetup()),
                        type.name()),
                1e-9);
        assertEquals(12, response.getSummary().getTotalPowerUsed());
        assertEquals(4, response.getSummary().getDrifsPlaced());
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
