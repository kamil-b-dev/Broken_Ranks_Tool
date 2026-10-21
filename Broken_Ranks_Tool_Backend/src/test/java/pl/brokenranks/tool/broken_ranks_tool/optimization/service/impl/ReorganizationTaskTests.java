package pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl;

import static org.junit.jupiter.api.Assertions.*;
import static pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl.OptimizationCalculatorFixture.*;

import java.util.*;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.*;

class ReorganizationTaskTests {
    private static final DRIF_BONUS_TYPE CRIT = DRIF_BONUS_TYPE.CRITICAL_CHANCE;
    private static final DRIF_BONUS_TYPE MANA = DRIF_BONUS_TYPE.MANA_REGEN;

    private ReorganizationOptions.Insertion insertion(String id, String target) {
        var row = new ReorganizationOptions.Insertion();
        row.setEntryId(id);
        row.setTargetSlotKey(target);
        return row;
    }

    @Test
    void insertsSeveralIdenticalOccurrencesIntoTheirRequestedItemsAndUpgradesAnEquippedStone() {
        var fixture =
                create(
                        List.of(
                                item(1, ITEM_CATEGORY.HELMET, "X", 12),
                                item(2, ITEM_CATEGORY.ARMOR, "X", 16),
                                item(3, ITEM_CATEGORY.BOOTS, "X", 12)),
                        List.of(drif(12, CRIT, DRIF_SIZE.ARCYDRIF, "3%", "1%")),
                        List.of());
        var request = upgradeRequest();
        request.setOriginalSlots(
                Map.of(
                        "helmet",
                        request.getOriginalSlots().get("helmet"),
                        "armor",
                        slot(2),
                        "boots",
                        slot(3)));
        var first = new OptimizationRequest.BackpackDrif();
        first.setId("one");
        first.setTemplateId(12L);
        first.setLevel(6);
        var second = new OptimizationRequest.BackpackDrif();
        second.setId("two");
        second.setTemplateId(12L);
        second.setLevel(6);
        request.setBackpackDrifs(List.of(first, second));
        request.setBackpackSlotCount(2);
        var options = request.getReorganization();
        options.setTask(ReorganizationOptions.Task.INSERT);
        options.setInsertions(List.of(insertion("one", "helmet"), insertion("two", "boots")));
        var result = fixture.service().optimize(request);
        assertEquals(
                OptimizationOutcome.VALID_BUILD,
                result.getSummary().getOutcome(),
                result.getSummary().getMessage());
        assertEquals(3, result.getReorganizationDrifUsages().size());
        assertTrue(
                result.getReorganizationDrifUsages().stream()
                        .anyMatch(
                                usage ->
                                        "one".equals(usage.entryId())
                                                && usage.slotKey().equals("helmet")));
        assertTrue(
                result.getReorganizationDrifUsages().stream()
                        .anyMatch(
                                usage ->
                                        "two".equals(usage.entryId())
                                                && usage.slotKey().equals("boots")));
        assertTrue(
                result.getOptimizedSetup()
                        .getSlots()
                        .get("armor")
                        .getDrifLevels()
                        .containsValue(21));
        assertEquals(
                fixture.calculator().calculateTotalStats(result.getOptimizedSetup()),
                result.getCalculationResult().stats());
        options.setInsertions(List.of(insertion("one", "helmet"), insertion("one", "boots")));
        assertEquals(
                OptimizationOutcome.INVALID_INPUT,
                fixture.service().optimize(request).getSummary().getOutcome());
    }

    @Test
    void reportsProvenPhysicalObstructionsWithoutClaimingAnExhaustiveSearch() {
        var request = upgradeRequest();
        request.getOriginalSlots().get("helmet").setDrifLevels(Map.of("0", 6));
        var options = request.getReorganization();
        options.setTask(ReorganizationOptions.Task.INSERT);
        options.setUpgrade(null);
        var chosen = new OptimizationRequest.BackpackDrif();
        chosen.setId("chosen");
        chosen.setTemplateId(12L);
        chosen.setLevel(21);
        request.setBackpackDrifs(List.of(chosen));
        options.setInsertions(List.of(insertion("chosen", "helmet")));
        var result = fixture(16, false).service().optimize(request);
        assertEquals(OptimizationOutcome.NO_BUILD_FOUND, result.getSummary().getOutcome());
        assertTrue(result.getSummary().getMessage().contains("tierze, pojemności i blokadach"));
        assertFalse(result.getSummary().getSearchReport().proofComplete());
        options.setInsertEntryId("chosen");
        assertEquals(
                OptimizationOutcome.INVALID_INPUT,
                fixture(16, false).service().optimize(request).getSummary().getOutcome());
    }

    private OptimizationCalculatorFixture fixture(int armorCapacity, boolean armorBonus) {
        var armor = item(2, ITEM_CATEGORY.ARMOR, "X", armorCapacity);
        if (armorBonus) armor.setStats(Map.of("Bonus drify", 20.0));
        return create(
                List.of(item(1, ITEM_CATEGORY.HELMET, "X", 12), armor),
                List.of(
                        drif(10, CRIT, DRIF_SIZE.MAGNIDRIF, "2%", "1%"),
                        drif(11, MANA, DRIF_SIZE.SUBDRIF, "1%", "1%"),
                        drif(12, CRIT, DRIF_SIZE.ARCYDRIF, "3%", "1%")),
                List.of());
    }

    private OptimizationRequest upgradeRequest() {
        var helmet = slot(1, 12L);
        helmet.setDrifLevels(Map.of("0", 16));
        var armor = slot(2, 11L);
        armor.setDrifLevels(Map.of("0", 6));
        var request = request(Map.of("helmet", helmet, "armor", armor), Map.of(CRIT, 30));
        request.setMode(OptimizationMode.REORGANIZE);
        var options = new ReorganizationOptions();
        options.setTask(ReorganizationOptions.Task.UPGRADE);
        options.setGoal(CRIT);
        var upgrade = new ReorganizationOptions.Upgrade();
        upgrade.setSourceSlotKey("helmet");
        upgrade.setSourceDrifIndex(0);
        upgrade.setTargetTemplateId(12L);
        upgrade.setTargetLevel(21);
        options.setUpgrade(upgrade);
        request.setReorganization(options);
        return request;
    }

    @Test
    void rearrangesExistingStonesToFitTheSelectedUpgradeAndReportsCalculatorDeltas() {
        var fixture = fixture(16, false);
        var request = upgradeRequest();
        var result = fixture.service().optimize(request);
        assertEquals(
                OptimizationOutcome.VALID_BUILD,
                result.getSummary().getOutcome(),
                result.getSummary().getMessage());
        assertEquals(2, result.getReorganizationDrifUsages().size());
        var selected =
                result.getReorganizationDrifUsages().stream()
                        .filter(usage -> "helmet".equals(usage.sourceSlotKey()))
                        .findFirst()
                        .orElseThrow();
        assertEquals("armor", selected.slotKey());
        assertEquals(
                21,
                result.getOptimizedSetup()
                        .getSlots()
                        .get("armor")
                        .getDrifLevels()
                        .get(String.valueOf(selected.drifIndex())));
        assertTrue(
                result.getReorganizationStatChanges().stream()
                        .anyMatch(change -> change.statKey().equals(CRIT.name())));
        assertEquals(
                fixture.calculator().calculateTotalStats(result.getOptimizedSetup()),
                result.getCalculationResult().stats());
        assertEquals(16, request.getOriginalSlots().get("helmet").getDrifLevels().get("0"));
    }

    @Test
    void supportsIncreasingSizeWithoutCreatingAnotherStone() {
        var request = upgradeRequest();
        request.getOriginalSlots().get("helmet").setDrifIds(List.of(10L));
        var result = fixture(16, false).service().optimize(request);
        assertEquals(OptimizationOutcome.VALID_BUILD, result.getSummary().getOutcome());
        assertEquals(2, result.getReorganizationDrifUsages().size());
        assertFalse(
                result.getOptimizedSetup().getSlots().values().stream()
                        .anyMatch(slot -> slot.getDrifIds().contains(10L)));
    }

    @Test
    void appliesTheMoveLimitToBothStonesOfASwapAndToHighestLevelSearch() {
        var fixture = fixture(16, false);
        var request = upgradeRequest();
        request.getReorganization().setMaxMoves(1);
        assertEquals(
                OptimizationOutcome.NO_BUILD_FOUND,
                fixture.service().optimize(request).getSummary().getOutcome());
        request.getReorganization().setMaxMoves(2);
        assertEquals(
                OptimizationOutcome.VALID_BUILD,
                fixture.service().optimize(request).getSummary().getOutcome());
        request.getReorganization().setMaxMoves(1);
        request.getReorganization().getUpgrade().setMaximizeLevel(true);
        var result = fixture.service().optimize(request);
        assertEquals(OptimizationOutcome.VALID_BUILD, result.getSummary().getOutcome());
        assertEquals(16, request.getReorganization().getUpgrade().getTargetLevel());
        assertTrue(
                result.getReorganizationDrifUsages().stream()
                        .allMatch(
                                usage ->
                                        usage.slotKey().equals(usage.sourceSlotKey())
                                                && usage.drifIndex() == usage.sourceDrifIndex()));
    }

    @Test
    void countsAnInsertionAndTheStoneReturnedToTheBackpackSeparately() {
        var request = upgradeRequest();
        var helmet = slot(1, 12L);
        helmet.setDrifLevels(Map.of("0", 6));
        request.setOriginalSlots(Map.of("helmet", helmet));
        var options = request.getReorganization();
        options.setTask(ReorganizationOptions.Task.INSERT);
        options.setUpgrade(null);
        options.setInsertEntryId("chosen");
        options.setAllowUnequip(true);
        var chosen = new OptimizationRequest.BackpackDrif();
        chosen.setId("chosen");
        chosen.setTemplateId(12L);
        chosen.setLevel(6);
        request.setBackpackDrifs(List.of(chosen));
        options.setMaxMoves(1);
        var fixture = fixture(16, false);
        assertEquals(
                OptimizationOutcome.NO_BUILD_FOUND,
                fixture.service().optimize(request).getSummary().getOutcome());
        options.setMaxMoves(2);
        var result = fixture.service().optimize(request);
        assertEquals(OptimizationOutcome.VALID_BUILD, result.getSummary().getOutcome());
        assertEquals(1, result.getReorganizationDrifUsages().size());
        assertEquals("chosen", result.getReorganizationDrifUsages().getFirst().entryId());
    }

    @Test
    void rejectsMoveLimitsOutsideThePlayerRangeBeforeSearch() {
        for (Integer limit : Arrays.asList(null, 0, 51)) {
            var request = upgradeRequest();
            request.getReorganization().setMaxMoves(limit);
            assertEquals(
                    OptimizationOutcome.INVALID_INPUT,
                    fixture(16, false).service().optimize(request).getSummary().getOutcome());
        }
    }

    @Test
    void preservesEveryEquippedStoneUnlessUnequippingWasExplicitlyEnabled() {
        var request = upgradeRequest();
        var combined = slot(2, 12L, 11L);
        combined.setDrifLevels(Map.of("0", 16, "1", 6));
        request.setOriginalSlots(Map.of("armor", combined));
        request.getReorganization().getUpgrade().setSourceSlotKey("armor");
        var fixture = fixture(16, false);
        assertEquals(
                OptimizationOutcome.NO_BUILD_FOUND,
                fixture.service().optimize(request).getSummary().getOutcome());
        request.getReorganization().setAllowUnequip(true);
        var protection = new ReorganizationOptions.Protection();
        protection.setEnabled(false);
        request.getReorganization().setProtectedModifiers(Map.of(MANA, protection));
        assertEquals(1, fixture.service().optimize(request).getReorganizationDrifUsages().size());
    }

    @Test
    void protectsOtherModifiersAndAllowsOnlyTheExplicitLoss() {
        var request = upgradeRequest();
        var fixture = fixture(16, true);
        var blocked = fixture.service().optimize(request);
        assertEquals(OptimizationOutcome.NO_BUILD_FOUND, blocked.getSummary().getOutcome());
        assertFalse(blocked.getSummary().getSearchReport().proofComplete());
        var protection = new ReorganizationOptions.Protection();
        protection.setLoss(2);
        request.getReorganization().setProtectedModifiers(Map.of(MANA, protection));
        assertEquals(
                OptimizationOutcome.VALID_BUILD,
                fixture.service().optimize(request).getSummary().getOutcome());
    }

    @Test
    void rejectsLockedMissingDowngradedAndWrongTypeTargets() {
        for (java.util.function.Consumer<OptimizationRequest> change :
                List.<java.util.function.Consumer<OptimizationRequest>>of(
                        r -> r.setLockedSlots(Set.of("helmet")),
                        r -> r.setLockedDrifs(Map.of("helmet", Set.of(0))),
                        r -> r.getReorganization().getUpgrade().setSourceDrifIndex(2),
                        r -> r.getReorganization().getUpgrade().setTargetTemplateId(11L),
                        r -> r.getReorganization().getUpgrade().setTargetTemplateId(10L),
                        r -> r.getReorganization().getUpgrade().setTargetLevel(15),
                        r -> r.getReorganization().getUpgrade().setTargetLevel(22))) {
            var request = upgradeRequest();
            change.accept(request);
            assertEquals(
                    OptimizationOutcome.INVALID_INPUT,
                    fixture(16, false).service().optimize(request).getSummary().getOutcome());
        }
    }

    @Test
    void cannotReturnTheUnchangedBuildWhenTheRequestedUpgradeDoesNotFit() {
        var result = fixture(12, false).service().optimize(upgradeRequest());
        assertEquals(OptimizationOutcome.NO_BUILD_FOUND, result.getSummary().getOutcome());
        assertNull(result.getReorganizationDrifUsages());
    }

    @Test
    void keepsTheSelectedIdentityDistinctFromAnAlreadyOwnedIdenticalTarget() {
        var fixture =
                create(
                        List.of(
                                item(1, ITEM_CATEGORY.HELMET, "X", 12),
                                item(2, ITEM_CATEGORY.ARMOR, "X", 16),
                                item(3, ITEM_CATEGORY.BOOTS, "X", 16)),
                        List.of(drif(12, CRIT, DRIF_SIZE.ARCYDRIF, "3%", "1%")),
                        List.of());
        var request = upgradeRequest();
        var existing = slot(2, 12L);
        existing.setDrifLevels(Map.of("0", 21));
        request.setOriginalSlots(
                Map.of(
                        "helmet",
                        request.getOriginalSlots().get("helmet"),
                        "armor",
                        existing,
                        "boots",
                        slot(3)));
        var result = fixture.service().optimize(request);
        assertEquals(OptimizationOutcome.VALID_BUILD, result.getSummary().getOutcome());
        assertEquals(2, result.getReorganizationDrifUsages().size());
        assertEquals(
                2,
                result.getReorganizationDrifUsages().stream()
                        .map(usage -> usage.sourceSlotKey() + ":" + usage.sourceDrifIndex())
                        .distinct()
                        .count());
        assertTrue(
                result.getReorganizationDrifUsages().stream()
                        .anyMatch(usage -> "helmet".equals(usage.sourceSlotKey())));
        assertTrue(
                result.getReorganizationDrifUsages().stream()
                        .anyMatch(usage -> "armor".equals(usage.sourceSlotKey())));
    }

    @Test
    void protectsNegativeDirectionAndDoesNotProtectSurplusAboveACap() {
        var armor = item(2, ITEM_CATEGORY.ARMOR, "X", 16);
        armor.setStats(Map.of("Bonus drify", 20.0));
        for (boolean negative : List.of(true, false)) {
            var type = negative ? DRIF_BONUS_TYPE.MANA_USAGE_REDUCTION : MANA;
            var fixture =
                    create(
                            List.of(item(1, ITEM_CATEGORY.HELMET, "X", 12), armor),
                            List.of(
                                    drif(12, CRIT, DRIF_SIZE.ARCYDRIF, "3%", "1%"),
                                    drif(
                                            11,
                                            type,
                                            DRIF_SIZE.SUBDRIF,
                                            negative ? "-2%" : "70%",
                                            negative ? "-1%" : "5%")),
                            List.of());
            var request = upgradeRequest();
            assertEquals(
                    negative ? OptimizationOutcome.NO_BUILD_FOUND : OptimizationOutcome.VALID_BUILD,
                    fixture.service().optimize(request).getSummary().getOutcome());
            if (negative) {
                var protection = new ReorganizationOptions.Protection();
                protection.setLoss(2);
                request.getReorganization().setProtectedModifiers(Map.of(type, protection));
                assertEquals(
                        OptimizationOutcome.VALID_BUILD,
                        fixture.service().optimize(request).getSummary().getOutcome());
            }
        }
    }

    @Test
    void fitsSeveralUpgradesTogetherAndRejectsDuplicateSources() {
        var request = upgradeRequest();
        var first = request.getReorganization().getUpgrade();
        var second = new ReorganizationOptions.Upgrade();
        second.setSourceSlotKey("armor");
        second.setSourceDrifIndex(0);
        second.setTargetTemplateId(11L);
        second.setTargetLevel(6);
        request.getOriginalSlots().get("armor").setDrifLevels(Map.of("0", 1));
        request.getReorganization().setUpgrade(null);
        request.getReorganization().setUpgrades(List.of(first, second));
        var result = fixture(16, false).service().optimize(request);
        assertEquals(
                OptimizationOutcome.VALID_BUILD,
                result.getSummary().getOutcome(),
                result.getSummary().getMessage());
        assertEquals(2, result.getReorganizationDrifUsages().size());
        assertTrue(
                result.getOptimizedSetup().getSlots().values().stream()
                        .anyMatch(slot -> slot.getDrifLevels().containsValue(21)));
        assertTrue(
                result.getOptimizedSetup().getSlots().values().stream()
                        .anyMatch(slot -> slot.getDrifLevels().containsValue(6)));
        request.getReorganization().setUpgrades(List.of(first, first));
        assertEquals(
                OptimizationOutcome.INVALID_INPUT,
                fixture(16, false).service().optimize(request).getSummary().getOutcome());
    }

    @Test
    void insertsTheExactBackpackOccurrenceEvenWhenAnEquippedCopyIsIdentical() {
        var fixture = fixture(16, false);
        var request = upgradeRequest();
        var options = request.getReorganization();
        options.setTask(ReorganizationOptions.Task.INSERT);
        options.setUpgrade(null);
        options.setInsertEntryId("chosen");
        request.getOriginalSlots().get("helmet").setDrifLevels(Map.of("0", 6));
        var chosen = new OptimizationRequest.BackpackDrif();
        chosen.setId("chosen");
        chosen.setTemplateId(12L);
        chosen.setLevel(6);
        request.setBackpackDrifs(List.of(chosen));
        var result = fixture.service().optimize(request);
        assertEquals(
                OptimizationOutcome.VALID_BUILD,
                result.getSummary().getOutcome(),
                result.getSummary().getMessage());
        assertTrue(
                result.getReorganizationDrifUsages().stream()
                        .anyMatch(usage -> "chosen".equals(usage.entryId())));
        assertFalse(
                result.getReorganizationDrifUsages().stream()
                        .anyMatch(usage -> "other".equals(usage.entryId())));
        assertEquals(3, result.getReorganizationDrifUsages().size());
        assertEquals(
                2,
                result.getReorganizationDrifUsages().stream()
                        .filter(usage -> usage.entryId() == null)
                        .count());
    }

    @Test
    void reservesSocketsAndCapacityAndKeepsAlreadySatisfiedArrangements() {
        var request = upgradeRequest();
        var options = request.getReorganization();
        options.setTask(ReorganizationOptions.Task.RESERVE);
        options.setUpgrade(null);
        var reservation = new ReorganizationOptions.Reservation();
        reservation.setSlotKey("helmet");
        reservation.setFreeSockets(3);
        reservation.setFreeCapacity(12);
        options.setReservation(reservation);
        var result = fixture(16, false).service().optimize(request);
        assertEquals(
                OptimizationOutcome.VALID_BUILD,
                result.getSummary().getOutcome(),
                result.getSummary().getMessage());
        assertTrue(
                result.getOptimizedSetup().getSlots().get("helmet").getDrifIds().stream()
                        .allMatch(Objects::isNull));
        assertEquals(2, result.getReorganizationDrifUsages().size());
        request.setLockedSlots(Set.of("helmet"));
        assertEquals(
                OptimizationOutcome.NO_BUILD_FOUND,
                fixture(16, false).service().optimize(request).getSummary().getOutcome());
        request.setLockedSlots(Set.of());
        reservation.setFreeSockets(1);
        reservation.setFreeCapacity(0);
        result = fixture(16, false).service().optimize(request);
        assertEquals(OptimizationOutcome.VALID_BUILD, result.getSummary().getOutcome());
        assertTrue(
                result.getReorganizationDrifUsages().stream()
                        .allMatch(usage -> usage.slotKey().equals(usage.sourceSlotKey())));
    }

    @Test
    void searchesTheHighestLevelWithTheSameSharedBudget() {
        var request = upgradeRequest();
        request.getReorganization().getUpgrade().setMaximizeLevel(true);
        var result = fixture(12, false).service().optimize(request);
        assertEquals(
                OptimizationOutcome.VALID_BUILD,
                result.getSummary().getOutcome(),
                result.getSummary().getMessage());
        assertEquals(16, request.getReorganization().getUpgrade().getTargetLevel());
        assertFalse(result.getSummary().getSearchReport().proofComplete());
    }
}
