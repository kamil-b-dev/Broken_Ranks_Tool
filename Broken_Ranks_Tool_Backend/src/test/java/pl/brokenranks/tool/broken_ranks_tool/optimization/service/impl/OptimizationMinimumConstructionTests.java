package pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl;

import static org.junit.jupiter.api.Assertions.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl.OptimizationCalculatorFixture.*;

import java.util.*;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.OptimizationRequest;

class OptimizationMinimumConstructionTests {

    static Stream<Arguments> builtInSizeLimits() {
        return Stream.of(
                Arguments.of(0, 0, 1, 1, true),
                Arguments.of(0, 1, 1, 1, false),
                Arguments.of(1, 1, 2, 1, false),
                Arguments.of(2, 2, 2, 2, false));
    }

    @ParameterizedTest
    @MethodSource("builtInSizeLimits")
    void builtInsCountInSizeLimitsAndOnlyTheirExcessIsPreserved(
            int sizeMin, int sizeMax, int totalMax, int expectedCount, boolean warning) {
        var type = DRIF_BONUS_TYPE.CRITICAL_CHANCE;
        var epic = item(1, ITEM_CATEGORY.WEAPON_1H, "VII", 0);
        epic.setName("Washi");
        epic.setRarity(RARITY.EPIC);
        var crit = drif(10, type, DRIF_SIZE.MAGNIDRIF, "3%", "1%");
        var melee = drif(11, DRIF_BONUS_TYPE.HIT_CHANCE_MELEE, DRIF_SIZE.MAGNIDRIF, "2%", "1%");
        var fixture =
                create(
                        List.of(epic, item(2, ITEM_CATEGORY.HELMET, "VII", 12)),
                        List.of(crit, melee),
                        List.of());
        var request =
                request(Map.of("weapon", slot(1, 10L, 11L), "helmet", slot(2)), Map.of(type, 15));
        request.setTargetQuantities(
                Map.of(type, new OptimizationRequest.QuantityRange(1, totalMax)));
        var sizes = new EnumMap<DRIF_SIZE, OptimizationRequest.QuantityRange>(DRIF_SIZE.class);
        for (var size : DRIF_SIZE.values())
            sizes.put(size, new OptimizationRequest.QuantityRange(0, 0));
        sizes.put(DRIF_SIZE.MAGNIDRIF, new OptimizationRequest.QuantityRange(sizeMin, sizeMax));
        request.setDrifSizeQuantities(Map.of(type, sizes));
        request.setGenerateVariants(true);

        var response = assertDoesNotThrow(() -> fixture.service().optimize(request));
        assertTrue(response.getSummary().isSuccess(), response.getSummary().getMessage());
        assertEquals(
                List.of(10L, 11L),
                response.getOptimizedSetup().getSlots().get("weapon").getDrifIds());
        assertEquals(
                expectedCount, response.getSummary().getGoalResults().getFirst().placedCount());
        assertEquals(
                warning,
                response.getSummary().getWarnings().stream()
                        .anyMatch(message -> message.contains("wbudowanych drifów")));
        assertEquals(
                fixture.calculator().calculateTotalStats(response.getOptimizedSetup()),
                response.getCalculationResult().stats());
        // Original user limits must remain available to the report and subsequent runs.
        assertEquals(
                sizeMax,
                request.getDrifSizeQuantities().get(type).get(DRIF_SIZE.MAGNIDRIF).getMax());
    }

    @Test
    void zeroSizeLimitsWithoutBuiltInsRemainAReportedBusinessFailure() {
        var type = DRIF_BONUS_TYPE.CRITICAL_CHANCE;
        var fixture =
                create(
                        List.of(item(1, ITEM_CATEGORY.HELMET, "IV", 12)),
                        List.of(drif(10, type, DRIF_SIZE.MAGNIDRIF, "3%", "1%")),
                        List.of());
        var request = request(Map.of("helmet", slot(1)), Map.of(type, 15));
        request.setTargetQuantities(Map.of(type, new OptimizationRequest.QuantityRange(1, 1)));
        var sizes = new EnumMap<DRIF_SIZE, OptimizationRequest.QuantityRange>(DRIF_SIZE.class);
        for (var size : DRIF_SIZE.values())
            sizes.put(size, new OptimizationRequest.QuantityRange(0, 0));
        request.setDrifSizeQuantities(Map.of(type, sizes));
        var response = assertDoesNotThrow(() -> fixture.service().optimize(request));
        assertFalse(response.getSummary().isSuccess());
        assertTrue(response.getSummary().getMessage().contains("Minimum"));
    }

    @Test
    void ordinaryLockedDrifCannotUseTheBuiltInSizeException() {
        var type = DRIF_BONUS_TYPE.CRITICAL_CHANCE;
        var fixture =
                create(
                        List.of(item(1, ITEM_CATEGORY.HELMET, "VII", 12)),
                        List.of(drif(10, type, DRIF_SIZE.MAGNIDRIF, "3%", "1%")),
                        List.of());
        var request = request(Map.of("helmet", slot(1, 10L)), Map.of(type, 15));
        request.setLockedSlots(Set.of("helmet"));
        request.setDrifSizeQuantities(
                Map.of(
                        type,
                        Map.of(DRIF_SIZE.MAGNIDRIF, new OptimizationRequest.QuantityRange(0, 0))));
        var response = assertDoesNotThrow(() -> fixture.service().optimize(request));
        assertFalse(response.getSummary().isSuccess());
        assertTrue(response.getSummary().getMessage().contains("Zablokowane drify"));
    }

    @Test
    void wholeSlotLockDoesNotHideAnInvalidExplicitStoneLock() {
        var fixture =
                create(
                        List.of(item(1, ITEM_CATEGORY.HELMET, "IV", 12)),
                        List.of(
                                drif(
                                        10,
                                        DRIF_BONUS_TYPE.CRITICAL_CHANCE,
                                        DRIF_SIZE.SUBDRIF,
                                        "5%",
                                        "1%")),
                        List.of());
        var request =
                request(
                        Map.of("helmet", slot(1, 10L, null)),
                        Map.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE, 15));
        request.setLockedSlots(Set.of("helmet"));
        request.setLockedDrifs(Map.of("helmet", Set.of(1)));
        assertFalse(fixture.service().optimize(request).getSummary().isSuccess());
        request.setLockedDrifs(Map.of("helmet", Set.of(0)));
        assertTrue(fixture.service().optimize(request).getSummary().isSuccess());
    }

    static Stream<Arguments> lockedLayouts() {
        return Stream.of(
                Arguments.of(List.of()),
                Arguments.of(Arrays.asList(10L, null)),
                Arguments.of(Arrays.asList(null, 10L)),
                Arguments.of(Arrays.asList(null, null)));
    }

    @ParameterizedTest
    @MethodSource("lockedLayouts")
    void wholeSlotLockPreservesEmptySocketsAcceptedByCalculator(List<Long> ids) {
        var item = item(1, ITEM_CATEGORY.HELMET, "IV", 12);
        var drif = drif(10, DRIF_BONUS_TYPE.CRITICAL_CHANCE, DRIF_SIZE.SUBDRIF, "5%", "1%");
        var fixture = create(List.of(item), List.of(drif), List.of());
        var original = slot(1);
        original.setDrifIds(ids);
        var request =
                request(Map.of("helmet", original), Map.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE, 15));
        request.setLockedSlots(Set.of("helmet"));
        var baseline = new EquipmentRequest();
        baseline.setSlots(request.getOriginalSlots());
        var result = fixture.service().optimize(request);
        assertTrue(result.getSummary().isSuccess(), result.getSummary().getMessage());
        assertEquals(ids, result.getOptimizedSetup().getSlots().get("helmet").getDrifIds());
        assertEquals(
                fixture.calculator().calculateTotalStats(baseline),
                result.getCalculationResult().stats());
    }

    @Test
    void wholeSlotLockStillRejectsLevelsOnEmptySocket() {
        var fixture =
                create(List.of(item(1, ITEM_CATEGORY.HELMET, "IV", 12)), List.of(), List.of());
        var original = slot(1, (Long) null);
        original.setDrifLevels(Map.of("0", 6));
        var request =
                request(Map.of("helmet", original), Map.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE, 15));
        request.setLockedSlots(Set.of("helmet"));
        var result = fixture.service().optimize(request);
        assertFalse(result.getSummary().isSuccess());
        assertTrue(result.getSummary().getMessage().contains("indeks drifa"));
    }

    @Test
    void sameSizeMinimumsSucceedForEveryMapOrderOnTierRestrictedEquipment() {
        var low = item(1, ITEM_CATEGORY.HELMET, "I", 4);
        var high = item(2, ITEM_CATEGORY.ARMOR, "IV", 8);
        high.setStats(Map.of("Bonus drify", 100.0));
        var sub = drif(10, DRIF_BONUS_TYPE.CRITICAL_CHANCE, DRIF_SIZE.SUBDRIF, "5%", "1%");
        var bi = drif(11, DRIF_BONUS_TYPE.CRITICAL_CHANCE, DRIF_SIZE.BIDRIF, "6%", "1%");
        var fixture = create(List.of(low, high), List.of(sub, bi), List.of());
        EquipmentRequest expected = null;
        for (boolean reverse : List.of(false, true)) {
            Map<DRIF_SIZE, OptimizationRequest.QuantityRange> ranges = new LinkedHashMap<>();
            ranges.put(
                    reverse ? DRIF_SIZE.BIDRIF : DRIF_SIZE.SUBDRIF,
                    new OptimizationRequest.QuantityRange(1, 1));
            ranges.put(
                    reverse ? DRIF_SIZE.SUBDRIF : DRIF_SIZE.BIDRIF,
                    new OptimizationRequest.QuantityRange(1, 1));
            var request =
                    request(
                            Map.of("helmet", slot(1), "armor", slot(2)),
                            Map.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE, 15));
            request.setTargetQuantities(
                    Map.of(
                            DRIF_BONUS_TYPE.CRITICAL_CHANCE,
                            new OptimizationRequest.QuantityRange(2, 2)));
            request.setDrifSizeQuantities(Map.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE, ranges));
            var result = fixture.service().optimize(request);
            assertTrue(result.getSummary().isSuccess(), result.getSummary().getMessage());
            assertEquals(
                    List.of(10L), result.getOptimizedSetup().getSlots().get("helmet").getDrifIds());
            assertEquals(
                    List.of(11L), result.getOptimizedSetup().getSlots().get("armor").getDrifIds());
            if (expected != null) assertEquals(expected, result.getOptimizedSetup());
            expected = result.getOptimizedSetup();
        }
    }
}
