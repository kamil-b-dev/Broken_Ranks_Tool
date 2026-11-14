package pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl;

import static org.junit.jupiter.api.Assertions.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl.OptimizationCalculatorFixture.*;

import java.util.*;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest.SlotData;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.*;

class BackpackDrifOptimizationTests {
    private OptimizationRequest.BackpackDrif owned(String id, long template, int level) {
        var entry = new OptimizationRequest.BackpackDrif();
        entry.setId(id);
        entry.setTemplateId(template);
        entry.setLevel(level);
        return entry;
    }

    private OptimizationRequest using(
            Map<String, SlotData> slots, OptimizationRequest.BackpackDrif... entries) {
        var request = request(slots, Map.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE, 20));
        request.setBackpackOnly(true);
        request.setConfigurationMode(BuildConfigurationMode.ADVANCED);
        request.setBackpackDrifs(List.of(entries));
        return request;
    }

    private OptimizationCalculatorFixture fixture(
            List<pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate>
                    items) {
        return create(
                items,
                List.of(
                        drif(10, DRIF_BONUS_TYPE.CRITICAL_CHANCE, DRIF_SIZE.SUBDRIF, "2%", "1%"),
                        drif(11, DRIF_BONUS_TYPE.CRITICAL_CHANCE, DRIF_SIZE.ARCYDRIF, "10%", "2%")),
                List.of());
    }

    @Test
    void searchesOwnedLevelsDirectlyWithoutCatalogFallback() {
        var fixture = fixture(List.of(item(1, ITEM_CATEGORY.HELMET, "X", 24)));
        var plain =
                fixture.service()
                        .optimize(
                                request(
                                        Map.of("helmet", slot(1)),
                                        Map.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE, 20)));
        var response =
                fixture.service()
                        .optimize(using(Map.of("helmet", slot(1)), owned("owned", 11, 18)));
        assertNull(response.getTargetSetup());
        assertEquals(
                18, response.getOptimizedSetup().getSlots().get("helmet").getDrifLevels().get("0"));
        assertEquals(
                List.of(new OptimizationResponse.BackpackDrifUsage("owned", "helmet", 0)),
                response.getBackpackDrifUsages());
        assertEquals(
                fixture.calculator().calculateTotalStats(response.getOptimizedSetup()),
                response.getCalculationResult().stats());
        assertNotEquals(
                plain.getCalculationResult().stats(), response.getCalculationResult().stats());
        var stages = response.getSummary().getSearchReport().stageSeconds();
        assertFalse(stages.containsKey("refinement"));
        assertFalse(stages.containsKey("backpackSubstitution"));
        assertTrue(stages.containsKey("backpackConstruction"));
    }

    @Test
    void usesOwnedSizesAndRejectsEmptySelectionInsteadOfCatalogFallback() {
        var other = drif(12, DRIF_BONUS_TYPE.MANA_REGEN, DRIF_SIZE.ARCYDRIF, "1%", "1%");
        var fixture =
                create(
                        List.of(item(1, ITEM_CATEGORY.HELMET, "X", 24)),
                        List.of(
                                drif(
                                        10,
                                        DRIF_BONUS_TYPE.CRITICAL_CHANCE,
                                        DRIF_SIZE.SUBDRIF,
                                        "2%",
                                        "1%"),
                                drif(
                                        11,
                                        DRIF_BONUS_TYPE.CRITICAL_CHANCE,
                                        DRIF_SIZE.ARCYDRIF,
                                        "10%",
                                        "2%"),
                                other),
                        List.of());
        var response =
                fixture.service()
                        .optimize(
                                using(
                                        Map.of("helmet", slot(1)),
                                        owned("small", 10, 3),
                                        owned("other", 12, 18)));
        assertEquals(
                List.of(10L),
                response.getOptimizedSetup().getSlots().get("helmet").getDrifIds().stream()
                        .filter(Objects::nonNull)
                        .toList());
        assertEquals("small", response.getBackpackDrifUsages().getFirst().entryId());
        var empty = fixture.service().optimize(using(Map.of("helmet", slot(1))));
        assertEquals(OptimizationOutcome.INVALID_INPUT, empty.getSummary().getOutcome());
    }

    @Test
    void usesEachOccurrenceOnceAndLeavesOtherSocketsEmpty() {
        var fixture =
                fixture(
                        List.of(
                                item(1, ITEM_CATEGORY.HELMET, "X", 24),
                                item(2, ITEM_CATEGORY.ARMOR, "X", 24),
                                item(3, ITEM_CATEGORY.BOOTS, "X", 24)));
        var response =
                fixture.service()
                        .optimize(
                                using(
                                        Map.of(
                                                "helmet", slot(1), "armor", slot(2), "boots",
                                                slot(3)),
                                        owned("one", 11, 6),
                                        owned("two", 11, 6)));
        assertEquals(
                Set.of("one", "two"),
                new HashSet<>(
                        response.getBackpackDrifUsages().stream()
                                .map(OptimizationResponse.BackpackDrifUsage::entryId)
                                .toList()));
        assertEquals(2, response.getBackpackDrifUsages().size());
        var levels =
                response.getOptimizedSetup().getSlots().values().stream()
                        .flatMap(s -> s.getDrifLevels().values().stream())
                        .toList();
        assertEquals(2, levels.stream().filter(level -> level == 6).count());
        assertEquals(2, response.getSummary().getDrifsPlaced());
    }

    @Test
    void rejectsHardMinimumsWhenBackpackHasFewerStones() {
        var fixture =
                fixture(
                        List.of(
                                item(1, ITEM_CATEGORY.HELMET, "X", 24),
                                item(2, ITEM_CATEGORY.ARMOR, "X", 24)));
        var request = using(Map.of("helmet", slot(1), "armor", slot(2)), owned("one", 11, 6));
        request.setTargetQuantities(
                Map.of(
                        DRIF_BONUS_TYPE.CRITICAL_CHANCE,
                        new OptimizationRequest.QuantityRange(2, 2)));
        var response = fixture.service().optimize(request);
        assertEquals(OptimizationOutcome.INVALID_INPUT, response.getSummary().getOutcome());
        assertTrue(response.getSummary().getMessage().contains("za mało drifów"));
        assertNull(response.getCalculationResult());
    }

    @Test
    void keepsLockedAndBuiltInStonesAtTheirActualLevels() {
        var epic = item(4, ITEM_CATEGORY.WEAPON_1H, "VII", 0);
        epic.setName("Washi");
        epic.setRarity(RARITY.EPIC);
        var weapon = slot(4, 12L, 13L);
        weapon.setDrifLevels(Map.of("0", 2, "1", 3));
        var helmet = slot(1, 11L);
        helmet.setDrifLevels(Map.of("0", 2));
        var fixture =
                create(
                        List.of(
                                item(1, ITEM_CATEGORY.HELMET, "X", 24),
                                item(2, ITEM_CATEGORY.ARMOR, "X", 24),
                                epic),
                        List.of(
                                drif(
                                        11,
                                        DRIF_BONUS_TYPE.CRITICAL_CHANCE,
                                        DRIF_SIZE.ARCYDRIF,
                                        "10%",
                                        "2%"),
                                drif(
                                        12,
                                        DRIF_BONUS_TYPE.CRITICAL_CHANCE,
                                        DRIF_SIZE.MAGNIDRIF,
                                        "4%",
                                        "1%"),
                                drif(
                                        13,
                                        DRIF_BONUS_TYPE.HIT_CHANCE_MELEE,
                                        DRIF_SIZE.MAGNIDRIF,
                                        "1%",
                                        "1%")),
                        List.of());
        var request =
                using(
                        Map.of("helmet", helmet, "armor", slot(2), "weapon", weapon),
                        owned("one", 11, 5),
                        owned("builtin", 12, 2));
        request.setLockedDrifs(Map.of("helmet", Set.of(0)));
        var response = fixture.service().optimize(request);
        assertTrue(response.getSummary().isSuccess(), response.getSummary().getMessage());
        assertEquals(
                2, response.getOptimizedSetup().getSlots().get("helmet").getDrifLevels().get("0"));
        assertEquals(
                5, response.getOptimizedSetup().getSlots().get("armor").getDrifLevels().get("0"));
        assertEquals(
                Map.of("0", 2, "1", 3),
                response.getOptimizedSetup().getSlots().get("weapon").getDrifLevels());
        assertEquals(
                List.of(new OptimizationResponse.BackpackDrifUsage("one", "armor", 0)),
                response.getBackpackDrifUsages());
    }

    @Test
    void prefersTheClosestOwnedLevelDeterministically() {
        var fixture = fixture(List.of(item(1, ITEM_CATEGORY.HELMET, "X", 24)));
        var response =
                fixture.service()
                        .optimize(
                                using(
                                        Map.of("helmet", slot(1)),
                                        owned("lower", 11, 6),
                                        owned("closer", 11, 18),
                                        owned("exact", 11, 21)));
        assertEquals("exact", response.getBackpackDrifUsages().getFirst().entryId());
        var lower =
                fixture.service()
                        .optimize(
                                using(
                                        Map.of("helmet", slot(1)),
                                        owned("lower", 11, 6),
                                        owned("closer", 11, 18)));
        assertEquals("closer", lower.getBackpackDrifUsages().getFirst().entryId());
    }

    @Test
    void allowsSoftTargetsToWorsenAndReportsTheActualCalculatorResult() {
        var fixture = fixture(List.of(item(1, ITEM_CATEGORY.HELMET, "X", 24)));
        var request = using(Map.of("helmet", slot(1)), owned("one", 11, 1));
        request.setForcedPercentageTargets(Map.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE, 50.0));
        var response = fixture.service().optimize(request);
        assertEquals(
                OptimizationOutcome.VALID_BUILD_SOFT_TARGETS_UNMET,
                response.getSummary().getOutcome());
        assertEquals(
                1, response.getOptimizedSetup().getSlots().get("helmet").getDrifLevels().get("0"));
        assertEquals(1, response.getBackpackDrifUsages().size());
        assertFalse(response.getSummary().getWarnings().isEmpty());
        assertEquals(
                fixture.calculator().calculateTotalStats(response.getOptimizedSetup()),
                response.getCalculationResult().stats());
    }

    @Test
    void refusesHigherOwnedPowerWhenItWouldOverflowTheFinalSlot() {
        var fixture =
                create(
                        List.of(item(1, ITEM_CATEGORY.HELMET, "IV", 4)),
                        List.of(
                                drif(
                                        10,
                                        DRIF_BONUS_TYPE.CRITICAL_CHANCE,
                                        DRIF_SIZE.BIDRIF,
                                        "4%",
                                        "1%")),
                        List.of());
        var response =
                fixture.service()
                        .optimize(using(Map.of("helmet", slot(1)), owned("higher", 10, 11)));
        assertEquals(0, response.getSummary().getDrifsPlaced());
        assertTrue(response.getBackpackDrifUsages().isEmpty());
    }

    @Test
    void canUseAHigherOwnedLevelWhenTheFinalSlotHasCapacity() {
        var fixture =
                create(
                        List.of(item(1, ITEM_CATEGORY.HELMET, "IV", 8)),
                        List.of(
                                drif(
                                        10,
                                        DRIF_BONUS_TYPE.CRITICAL_CHANCE,
                                        DRIF_SIZE.BIDRIF,
                                        "4%",
                                        "1%")),
                        List.of());
        var request = using(Map.of("helmet", slot(1)), owned("higher", 10, 11));
        request.setForcedPercentageTargets(Map.of(DRIF_BONUS_TYPE.CRITICAL_CHANCE, 6.0));
        var response = fixture.service().optimize(request);
        assertNull(response.getTargetSetup());
        assertEquals(
                11, response.getOptimizedSetup().getSlots().get("helmet").getDrifLevels().get("0"));
        assertEquals(1, response.getBackpackDrifUsages().size());
    }

    @Test
    void replacesEquippedOrdinaryStonesOnlyWithSelectedBackpackCopies() {
        var fixture = fixture(List.of(item(1, ITEM_CATEGORY.HELMET, "X", 24)));
        var original = slot(1, 11L);
        original.setDrifLevels(Map.of("0", 21));
        var response =
                fixture.service()
                        .optimize(using(Map.of("helmet", original), owned("small", 10, 3)));
        var result = response.getOptimizedSetup().getSlots().get("helmet");
        assertEquals(List.of(10L), result.getDrifIds().stream().filter(Objects::nonNull).toList());
        assertEquals(3, result.getDrifLevels().get("0"));
        assertEquals("small", response.getBackpackDrifUsages().getFirst().entryId());
        assertEquals(
                fixture.calculator().calculateTotalStats(response.getOptimizedSetup()),
                response.getCalculationResult().stats());
    }

    @Test
    void keepsRemovedStonesWithinTheBackpackCapacity() {
        var fixture = fixture(List.of(item(1, ITEM_CATEGORY.HELMET, "X", 24)));
        var request = using(Map.of("helmet", slot(1, 10L)), owned("one", 11, 6));
        request.setBackpackSlotCount(200);
        assertEquals(1, fixture.service().optimize(request).getBackpackDrifUsages().size());
        request.setTargetQuantities(
                Map.of(
                        DRIF_BONUS_TYPE.CRITICAL_CHANCE,
                        new OptimizationRequest.QuantityRange(0, 0)));
        assertEquals(
                OptimizationOutcome.NO_BUILD_FOUND,
                fixture.service().optimize(request).getSummary().getOutcome());
    }

    @Test
    void rejectsASizeMinimumWithoutOwnedCopiesOfThatSize() {
        var fixture = fixture(List.of(item(1, ITEM_CATEGORY.HELMET, "X", 24)));
        var request = using(Map.of("helmet", slot(1)), owned("small", 10, 6));
        request.setDrifSizeQuantities(
                Map.of(
                        DRIF_BONUS_TYPE.CRITICAL_CHANCE,
                        Map.of(DRIF_SIZE.ARCYDRIF, new OptimizationRequest.QuantityRange(1, 1))));
        assertEquals(
                OptimizationOutcome.INVALID_INPUT,
                fixture.service().optimize(request).getSummary().getOutcome());
    }

    @Test
    void rejectsInvalidStockLevelsAndDuplicateOccurrenceIds() {
        var fixture = fixture(List.of(item(1, ITEM_CATEGORY.HELMET, "X", 24)));
        assertFalse(
                fixture.service()
                        .optimize(using(Map.of("helmet", slot(1)), owned("bad", 10, 7)))
                        .getSummary()
                        .isSuccess());
        assertFalse(
                fixture.service()
                        .optimize(
                                using(
                                        Map.of("helmet", slot(1)),
                                        owned("same", 10, 2),
                                        owned("same", 10, 3)))
                        .getSummary()
                        .isSuccess());
    }
}
