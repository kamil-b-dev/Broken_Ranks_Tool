package pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl;

import static org.junit.jupiter.api.Assertions.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl.OptimizationCalculatorFixture.*;

import java.util.*;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.OrbTemplate;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;

class OptimizationOrbInputTests {
    private OptimizationCalculatorFixture fixture(RARITY rarity) {
        var item = item(1, ITEM_CATEGORY.HELMET, "X", 12);
        item.setRarity(rarity);
        var defense =
                OrbTemplate.builder()
                        .id(20L)
                        .name("Defense")
                        .size(ORB_SIZE.SUBORB)
                        .category(ORB_CATEGORY.DEFENSIVE)
                        .bonusType(ORB_BONUS_TYPE.DMG_REDUCTION_MELEE)
                        .bonusLvl1("2%")
                        .build();
        var offense =
                OrbTemplate.builder()
                        .id(21L)
                        .name("Offense")
                        .size(ORB_SIZE.SUBORB)
                        .category(ORB_CATEGORY.OFFENSIVE)
                        .bonusType(ORB_BONUS_TYPE.STRONGER_CRIT_CHANCE)
                        .bonusLvl1("2%")
                        .build();
        return create(List.of(item), List.of(), List.of(defense, offense));
    }

    static Stream<Arguments> legalSelections() {
        return Stream.of(
                Arguments.of(
                        RARITY.RARE,
                        Arrays.asList(null, null),
                        Arrays.asList(null, null),
                        List.of()),
                Arguments.of(
                        RARITY.RARE,
                        Arrays.asList(20L, null),
                        Arrays.asList(1, null),
                        List.of(20L)),
                Arguments.of(RARITY.LEGENDARY, Arrays.asList(null, null), List.of(), List.of()),
                Arguments.of(RARITY.LEGENDARY, Arrays.asList(20L, null), List.of(), List.of(20L)),
                Arguments.of(
                        RARITY.LEGENDARY, List.of(20L, 21L), List.of(1, 1), List.of(20L, 21L)));
    }

    @ParameterizedTest
    @MethodSource("legalSelections")
    void calculatorAndScratchAgreeOnZeroOneOrTwoOrbsWithoutChangingInput(
            RARITY rarity, List<Long> ids, List<Integer> levels, List<Long> expectedIds) {
        var fixture = fixture(rarity);
        var original = slot(1);
        original.setOrbIds(ids);
        original.setOrbLevels(levels);
        var setup = new EquipmentRequest();
        setup.setSlots(Map.of("helmet", original));
        var actual = assertDoesNotThrow(() -> fixture.calculator().calculateTotalStats(setup));
        var request = request(setup.getSlots(), Map.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE, 15));
        request.setTargetQuantities(
                Map.of(
                        DRIF_BONUS_TYPE.CRITICAL_CHANCE,
                        new OptimizationRequest.QuantityRange(0, 0)));
        var response = assertDoesNotThrow(() -> fixture.service().optimize(request));
        assertTrue(response.getSummary().isSuccess(), response.getSummary().getMessage());
        assertEquals(
                expectedIds, response.getOptimizedSetup().getSlots().get("helmet").getOrbIds());
        assertEquals(actual, response.getCalculationResult().stats());
        assertEquals(ids, original.getOrbIds());
        assertEquals(levels, original.getOrbLevels());
    }

    @ParameterizedTest
    @ValueSource(ints = {0, 1})
    void explicitNullLevelOnOccupiedOrbIsRejectedWithoutNullPointerException(int index) {
        var fixture = fixture(RARITY.LEGENDARY);
        var original = slot(1);
        original.setOrbIds(List.of(20L, 21L));
        var levels = new ArrayList<>(List.of(1, 1));
        levels.set(index, null);
        original.setOrbLevels(levels);
        var setup = new EquipmentRequest();
        setup.setSlots(Map.of("helmet", original));
        assertThrows(
                IllegalArgumentException.class,
                () -> fixture.calculator().calculateTotalStats(setup));
        var request = request(setup.getSlots(), Map.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE, 15));
        var response = assertDoesNotThrow(() -> fixture.service().optimize(request));
        assertFalse(response.getSummary().isSuccess());
        assertTrue(response.getSummary().getMessage().contains("poziom orba"));
    }

    @Test
    void normalizationDoesNotHideAGapRealOrphanLevelOrSecondOrbOnRareItem() {
        var fixture = fixture(RARITY.RARE);
        for (var ids :
                List.of(Arrays.asList(null, 20L), Arrays.asList(20L, null), List.of(20L, 21L))) {
            var original = slot(1);
            original.setOrbIds(ids);
            original.setOrbLevels(ids.getLast() == null ? List.of(1, 99) : List.of());
            var setup = new EquipmentRequest();
            setup.setSlots(Map.of("helmet", original));
            assertThrows(
                    IllegalArgumentException.class,
                    () -> fixture.calculator().calculateTotalStats(setup));
            var response =
                    assertDoesNotThrow(
                            () ->
                                    fixture.service()
                                            .optimize(
                                                    request(
                                                            setup.getSlots(),
                                                            Map.of(
                                                                    DRIF_BONUS_TYPE.CRITICAL_CHANCE,
                                                                    15))));
            assertFalse(response.getSummary().isSuccess());
        }
    }

    @Test
    void scratchMayReplaceInvalidUnlockedDrifsButReturnsACalculatorVerifiedSetup() {
        var fixture = fixture(RARITY.RARE);
        var original = slot(1, -1L);
        original.setDrifLevels(Map.of("bad", 999));
        var request =
                request(Map.of("helmet", original), Map.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE, 15));
        request.setTargetQuantities(
                Map.of(
                        DRIF_BONUS_TYPE.CRITICAL_CHANCE,
                        new OptimizationRequest.QuantityRange(0, 0)));
        var response = assertDoesNotThrow(() -> fixture.service().optimize(request));
        assertTrue(response.getSummary().isSuccess());
        assertEquals(
                fixture.calculator().calculateTotalStats(response.getOptimizedSetup()),
                response.getCalculationResult().stats());
        assertEquals(List.of(-1L), original.getDrifIds());
        request.setLockedDrifs(Map.of("helmet", Set.of(0)));
        assertFalse(fixture.service().optimize(request).getSummary().isSuccess());
    }
}
