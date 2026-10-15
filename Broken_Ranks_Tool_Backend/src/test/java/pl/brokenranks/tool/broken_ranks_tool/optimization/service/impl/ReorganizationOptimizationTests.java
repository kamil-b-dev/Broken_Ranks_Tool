package pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl;

import static org.junit.jupiter.api.Assertions.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl.OptimizationCalculatorFixture.*;

import java.util.*;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.*;

class ReorganizationOptimizationTests {
    private static final DRIF_BONUS_TYPE CRIT = DRIF_BONUS_TYPE.CRITICAL_CHANCE;
    private static final DRIF_BONUS_TYPE MANA = DRIF_BONUS_TYPE.MANA_REGEN;

    @Test
    void fullBackpackPreventsReturningEquippedStonesBeyondInventoryCapacity() {
        var fixture =
                create(
                        List.of(
                                item(1, ITEM_CATEGORY.HELMET, "I", 8),
                                item(2, ITEM_CATEGORY.ARMOR, "I", 8),
                                item(3, ITEM_CATEGORY.BOOTS, "I", 8),
                                item(4, ITEM_CATEGORY.GLOVES, "I", 8)),
                        List.of(drif(10, CRIT, DRIF_SIZE.SUBDRIF, "2%", "1%")),
                        List.of());
        var request =
                reorganize(
                        Map.of(
                                "helmet",
                                slot(1, 10L),
                                "armor",
                                slot(2, 10L),
                                "boots",
                                slot(3, 10L),
                                "gloves",
                                slot(4, 10L)));
        request.setPriorities(Map.of(MANA, 15));
        request.setBackpackSlotCount(200);
        var result = fixture.service().optimize(request);
        assertEquals(OptimizationOutcome.VALID_BUILD, result.getSummary().getOutcome());
        assertEquals(4, result.getReorganizationDrifUsages().size());
        request.setBackpackSlotCount(199);
        assertEquals(3, fixture.service().optimize(request).getReorganizationDrifUsages().size());
    }

    @Test
    void rejectsUnsupportedOptionsAndInconsistentBackpackCountsBeforeSearch() {
        for (java.util.function.Consumer<OptimizationRequest> invalid :
                List.<java.util.function.Consumer<OptimizationRequest>>of(
                        request -> request.setBackpackOnly(true),
                        request -> request.setGenerateVariants(true),
                        request -> request.setForceMaximizationByDrifBonus(true),
                        request -> request.setConfigurationMode(BuildConfigurationMode.SIMPLE),
                        request -> request.setBackpackSlotCount(0))) {
            var request = reorganize(Map.of("helmet", slot(1)), owned("single", 10, 6));
            invalid.accept(request);
            assertEquals(
                    OptimizationOutcome.INVALID_INPUT,
                    fixture().service().optimize(request).getSummary().getOutcome());
        }
    }

    private OptimizationRequest reorganize(
            Map<String, EquipmentRequest.SlotData> slots,
            OptimizationRequest.BackpackDrif... backpack) {
        var request = request(slots, Map.of(CRIT, 30, MANA, 10));
        request.setMode(OptimizationMode.REORGANIZE);
        request.setBackpackDrifs(List.of(backpack));
        return request;
    }

    private OptimizationRequest.BackpackDrif owned(String id, long template, int level) {
        var stone = new OptimizationRequest.BackpackDrif();
        stone.setId(id);
        stone.setTemplateId(template);
        stone.setLevel(level);
        return stone;
    }

    private OptimizationCalculatorFixture fixture() {
        var helmet = item(1, ITEM_CATEGORY.HELMET, "I", 8);
        helmet.setStats(Map.of("Bonus drify", 20.0));
        return create(
                List.of(helmet, item(2, ITEM_CATEGORY.ARMOR, "I", 8)),
                List.of(
                        drif(10, CRIT, DRIF_SIZE.SUBDRIF, "2%", "1%"),
                        drif(11, MANA, DRIF_SIZE.SUBDRIF, "1%", "1%"),
                        drif(12, CRIT, DRIF_SIZE.ARCYDRIF, "10%", "2%")),
                List.of());
    }

    @Test
    void matchesIndependentEnumerationOfSmallOwnedPoolWithoutCatalogOrLevelUpgrades() {
        var fixture = fixture();
        var original = slot(2, 10L);
        original.setDrifLevels(Map.of("0", 2));
        var request =
                reorganize(
                        Map.of("helmet", slot(1), "armor", original),
                        owned("crit-six", 10, 6),
                        owned("mana-four", 11, 4));
        var result = fixture.service().optimize(request);
        assertEquals(OptimizationOutcome.VALID_BUILD, result.getSummary().getOutcome());
        // Independent oracle enumerates actual occurrences in the two one-socket items.
        long[] ids = {0, 10, 10, 11};
        int[] levels = {1, 2, 6, 4};
        double bestUtility = Double.NEGATIVE_INFINITY;
        for (int a = 0; a < ids.length; a++) {
            for (int b = 0; b < ids.length; b++) {
                if (a != 0 && a == b) continue;
                var helmet = a == 0 ? slot(1) : slot(1, ids[a]);
                var armor = b == 0 ? slot(2) : slot(2, ids[b]);
                if (a != 0) helmet.setDrifLevels(Map.of("0", levels[a]));
                if (b != 0) armor.setDrifLevels(Map.of("0", levels[b]));
                var setup = new EquipmentRequest();
                setup.setSlots(Map.of("helmet", helmet, "armor", armor));
                var stats = fixture.calculator().calculateTotalStats(setup);
                bestUtility =
                        Math.max(
                                bestUtility,
                                number(stats, CRIT.name()) * 30 + number(stats, MANA.name()) * 10);
            }
        }
        var stats = result.getCalculationResult().stats();
        assertEquals(
                bestUtility,
                number(stats, CRIT.name()) * 30 + number(stats, MANA.name()) * 10,
                0.000001);
        assertEquals(fixture.calculator().calculateTotalStats(result.getOptimizedSetup()), stats);
        assertEquals(
                result.getOptimizedSetup(),
                fixture.service().optimize(request).getOptimizedSetup());
        assertFalse(result.getSummary().getSearchReport().proofComplete());
        assertNull(result.getTargetSetup());
        assertNotNull(result.getReorganizationDrifUsages());
        assertTrue(
                result.getOptimizedSetup().getSlots().values().stream()
                        .noneMatch(s -> s.getDrifIds().contains(12L)));
    }

    @Test
    void movesOwnedStoneAndPreservesExactLevelsAndOccurrenceSources() {
        var original = slot(2, 10L);
        original.setDrifLevels(Map.of("0", 3));
        var result =
                fixture()
                        .service()
                        .optimize(reorganize(Map.of("helmet", slot(1), "armor", original)));
        assertEquals(
                List.of(10L),
                result.getOptimizedSetup().getSlots().get("helmet").getDrifIds().stream()
                        .filter(Objects::nonNull)
                        .toList());
        var usage = result.getReorganizationDrifUsages().getFirst();
        assertEquals("armor", usage.sourceSlotKey());
        assertEquals(0, usage.sourceDrifIndex());
        assertEquals("helmet", usage.slotKey());
        assertEquals(
                3,
                result.getOptimizedSetup()
                        .getSlots()
                        .get("helmet")
                        .getDrifLevels()
                        .get(String.valueOf(usage.drifIndex())));
        assertNull(usage.entryId());
    }

    @Test
    void neverUsesAnOccurrenceTwiceAndCanLeaveExcessInTheBackpack() {
        var result =
                fixture()
                        .service()
                        .optimize(
                                reorganize(
                                        Map.of("helmet", slot(1), "armor", slot(2)),
                                        owned("single", 10, 6)));
        assertEquals(1, result.getReorganizationDrifUsages().size());
        assertEquals("single", result.getReorganizationDrifUsages().getFirst().entryId());
        assertEquals(1, result.getSummary().getDrifsPlaced());
    }

    @Test
    void preservesSlotAndStoneLocksAndReportsUnmetSoftTargets() {
        var request =
                reorganize(Map.of("helmet", slot(1), "armor", slot(2, 10L)), owned("spare", 10, 6));
        request.setLockedSlots(Set.of("helmet"));
        request.setLockedDrifs(Map.of("armor", Set.of(0)));
        request.setForceCapBonuses(Set.of(CRIT));
        var result = fixture().service().optimize(request);
        assertEquals(
                OptimizationOutcome.VALID_BUILD_SOFT_TARGETS_UNMET,
                result.getSummary().getOutcome());
        assertEquals(
                1,
                result.getOptimizedSetup()
                        .getSlots()
                        .get("armor")
                        .getDrifLevels()
                        .getOrDefault("0", 1));
        assertTrue(result.getReorganizationDrifUsages().isEmpty());
        assertTrue(result.getOptimizedSetup().getSlots().get("helmet").getDrifIds().isEmpty());
    }

    @Test
    void rejectsInventoryShortageAndInvalidUnblockedOwnedStones() {
        var request =
                reorganize(Map.of("helmet", slot(1), "armor", slot(2)), owned("single", 10, 6));
        request.setTargetQuantities(Map.of(CRIT, new OptimizationRequest.QuantityRange(2, 2)));
        var result = fixture().service().optimize(request);
        assertEquals(OptimizationOutcome.INVALID_INPUT, result.getSummary().getOutcome());
        assertTrue(result.getSummary().getMessage().contains("pula"));
        assertEquals(
                OptimizationOutcome.INVALID_INPUT,
                fixture()
                        .service()
                        .optimize(reorganize(Map.of("helmet", slot(1, 999L))))
                        .getSummary()
                        .getOutcome());
        assertEquals(
                OptimizationOutcome.INVALID_INPUT,
                fixture()
                        .service()
                        .optimize(reorganize(Map.of("helmet", slot(1)), owned("bad-level", 10, 7)))
                        .getSummary()
                        .getOutcome());
    }

    @Test
    void honorsCapacityTierAndHardSizeRestrictions() {
        var request =
                reorganize(
                        Map.of("helmet", slot(1)),
                        owned("too-large", 12, 21),
                        owned("fits", 10, 6));
        request.setDrifSizeQuantities(
                Map.of(
                        CRIT,
                        Map.of(DRIF_SIZE.SUBDRIF, new OptimizationRequest.QuantityRange(0, 0))));
        var result = fixture().service().optimize(request);
        assertEquals(OptimizationOutcome.VALID_BUILD, result.getSummary().getOutcome());
        assertTrue(result.getReorganizationDrifUsages().isEmpty());
    }

    @Test
    void preservesBuiltInStonesWithoutUpgradingOrAddingThemToThePool() {
        var epic = item(3, ITEM_CATEGORY.WEAPON_1H, "VII", 0);
        epic.setRarity(RARITY.EPIC);
        epic.setName("Allenor VII");
        var fixture =
                create(
                        List.of(epic, item(1, ITEM_CATEGORY.HELMET, "X", 24)),
                        List.of(
                                drif(
                                        10,
                                        DRIF_BONUS_TYPE.DAMAGE_PHYSICAL,
                                        DRIF_SIZE.MAGNIDRIF,
                                        "2%",
                                        "1%"),
                                drif(11, CRIT, DRIF_SIZE.MAGNIDRIF, "2%", "1%")),
                        List.of());
        var weapon = slot(3, 10L, 11L);
        weapon.setDrifLevels(Map.of("0", 3, "1", 7));
        var result =
                fixture.service().optimize(reorganize(Map.of("weapon", weapon, "helmet", slot(1))));
        assertEquals(OptimizationOutcome.VALID_BUILD, result.getSummary().getOutcome());
        assertEquals(weapon, result.getOptimizedSetup().getSlots().get("weapon"));
        assertTrue(result.getReorganizationDrifUsages().isEmpty());
    }

    @Test
    void placesElementalDrifsOnlyInWeaponAndDoesNotExceedCapacityOrRepeatBonus() {
        var fixture =
                create(
                        List.of(
                                item(1, ITEM_CATEGORY.HELMET, "X", 24),
                                item(3, ITEM_CATEGORY.WEAPON_1H, "X", 8)),
                        List.of(
                                drif(
                                        10,
                                        DRIF_BONUS_TYPE.DAMAGE_FIRE,
                                        DRIF_SIZE.ARCYDRIF,
                                        "2%",
                                        "1%"),
                                drif(
                                        11,
                                        DRIF_BONUS_TYPE.DAMAGE_FROST,
                                        DRIF_SIZE.ARCYDRIF,
                                        "2%",
                                        "1%")),
                        List.of());
        var request =
                reorganize(
                        Map.of("helmet", slot(1), "weapon", slot(3)),
                        owned("fire", 10, 6),
                        owned("fire-copy", 10, 6),
                        owned("frost", 11, 6));
        request.setPriorities(
                Map.of(DRIF_BONUS_TYPE.DAMAGE_FIRE, 20, DRIF_BONUS_TYPE.DAMAGE_FROST, 10));
        var result = fixture.service().optimize(request);
        assertEquals(OptimizationOutcome.VALID_BUILD, result.getSummary().getOutcome());
        assertEquals(1, result.getReorganizationDrifUsages().size());
        assertEquals("weapon", result.getReorganizationDrifUsages().getFirst().slotKey());
    }

    @Test
    void boundsLargePoolSearchAndKeepsEveryOwnedMultiplicityAndLevel() {
        var fixture =
                create(
                        List.of(
                                item(1, ITEM_CATEGORY.HELMET, "X", 24),
                                item(2, ITEM_CATEGORY.ARMOR, "X", 24),
                                item(3, ITEM_CATEGORY.BOOTS, "X", 24),
                                item(4, ITEM_CATEGORY.GLOVES, "X", 24)),
                        List.of(
                                drif(10, CRIT, DRIF_SIZE.ARCYDRIF, "2%", "1%"),
                                drif(11, MANA, DRIF_SIZE.ARCYDRIF, "1%", "1%")),
                        List.of());
        var stones = new ArrayList<OptimizationRequest.BackpackDrif>();
        for (int index = 0; index < 200; index++)
            stones.add(owned("owned-" + index, index % 2 == 0 ? 10 : 11, index % 21 + 1));
        var request =
                reorganize(
                        Map.of(
                                "helmet", slot(1), "armor", slot(2), "boots", slot(3), "gloves",
                                slot(4)),
                        stones.toArray(OptimizationRequest.BackpackDrif[]::new));
        var result = fixture.service().optimize(request);
        assertEquals(OptimizationOutcome.VALID_BUILD, result.getSummary().getOutcome());
        var usages = result.getReorganizationDrifUsages();
        assertFalse(usages.isEmpty());
        assertEquals(
                usages.size(),
                usages.stream()
                        .map(OptimizationResponse.ReorganizationDrifUsage::entryId)
                        .distinct()
                        .count());
        for (var usage : usages) {
            var source =
                    stones.stream()
                            .filter(stone -> stone.getId().equals(usage.entryId()))
                            .findFirst()
                            .orElseThrow();
            var destination = result.getOptimizedSetup().getSlots().get(usage.slotKey());
            assertEquals(source.getTemplateId(), destination.getDrifIds().get(usage.drifIndex()));
            assertEquals(
                    source.getLevel(),
                    destination.getDrifLevels().get(String.valueOf(usage.drifIndex())));
        }
        assertEquals(
                fixture.calculator().calculateTotalStats(result.getOptimizedSetup()),
                result.getCalculationResult().stats());
        assertFalse(result.getSummary().getSearchReport().proofComplete());
    }
}
