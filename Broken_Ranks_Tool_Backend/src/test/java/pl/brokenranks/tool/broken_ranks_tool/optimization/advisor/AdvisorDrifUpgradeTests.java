package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import static org.junit.jupiter.api.Assertions.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.*;

class AdvisorDrifUpgradeTests extends AdvisorOptimizationTestSupport {
    @ParameterizedTest
    @CsvSource({
        "MINIMUM_CHANGE,1",
        "MINIMUM_CHANGE,3",
        "MINIMUM_CHANGE,10",
        "BEST_RESULT,1",
        "BEST_RESULT,3",
        "BEST_RESULT,10"
    })
    void increasesSizeWithoutPurchasesAsOneUpgrade(AdvisorOptions.Strategy strategy, int actions) {
        var owned = drif(10, A, "2%");
        var larger = drif(20, A, "4%");
        larger.setSize(DRIF_SIZE.BIDRIF);
        var fixture =
                fixture(List.of(item(1, ITEM_CATEGORY.HELMET, "IV", 4, 0)), List.of(owned, larger));
        var original = slot(1, 1, 10L);
        original.setDrifLevels(Map.of("0", 6));
        var request = request(A, Map.of("helmet", original));
        request.getAdvisor().getAllowedChanges().setDrifUpgrades(true);
        request.getAdvisor().setStrategy(strategy);
        request.getAdvisor().setMaxActions(actions);

        var result = fixture.service.optimize(request);

        assertTrue(result.getSummary().isSuccess(), result.getSummary().getMessage());
        assertEquals(
                List.of(20L), result.getOptimizedSetup().getSlots().get("helmet").getDrifIds());
        assertEquals(
                6, result.getOptimizedSetup().getSlots().get("helmet").getDrifLevels().get("0"));
        var plan = result.getAdvisorReport().plans().getFirst();
        assertEquals(1, plan.upgrades());
        assertEquals(1, plan.actions().size());
        var action = plan.actionDetails().getFirst();
        assertEquals(AdvisorAction.Type.UPGRADE_DRIF, action.type());
        var change = action.drifs().getFirst();
        assertEquals("initial:helmet:0", change.identity());
        assertEquals(10L, change.fromDrifId());
        assertEquals(20L, change.drifId());
        assertEquals(6, change.fromLevel());
        assertEquals(6, change.toLevel());
        assertTrue(plan.actions().getFirst().contains("SUBDRIF"));
        assertTrue(plan.actions().getFirst().contains("BIDRIF"));
        assertEquals(List.of(10L), original.getDrifIds());
        assertEquals(
                fixture.calculator.calculateWithSources(result.getOptimizedSetup()),
                result.getCalculationResult());
        assertTrue(result.getAdvisorReport().proofComplete());
    }

    @ParameterizedTest
    @CsvSource({
        "BIDRIF,7,MAGNIDRIF,VII,8",
        "BIDRIF,11,MAGNIDRIF,VII,8",
        "MAGNIDRIF,12,ARCYDRIF,X,12",
        "MAGNIDRIF,16,ARCYDRIF,X,12"
    })
    void sizeOnlyUpgradePreservesBoundaryAndIntermediateLevels(
            DRIF_SIZE from, int level, DRIF_SIZE to, String tier, int capacity) {
        var owned = drif(10, A, "2%");
        owned.setSize(from);
        var larger = drif(20, A, "4%");
        larger.setSize(to);
        var fixture =
                fixture(
                        List.of(item(1, ITEM_CATEGORY.HELMET, tier, capacity, 0)),
                        List.of(owned, larger));
        var original = slot(1, 1, 10L);
        original.setDrifLevels(Map.of("0", level));
        var request = request(A, Map.of("helmet", original));
        request.getAdvisor().getAllowedChanges().setDrifUpgrades(true);

        var result = fixture.service.optimize(request);

        assertEquals(
                List.of(20L), result.getOptimizedSetup().getSlots().get("helmet").getDrifIds());
        assertEquals(
                level,
                result.getOptimizedSetup().getSlots().get("helmet").getDrifLevels().get("0"));
        assertEquals(1, result.getAdvisorReport().plans().getFirst().upgrades());
    }

    @Test
    void increasesSizeAndLevelTogetherWhileKeepingTheSameModifierCount() {
        var owned = drif(10, A, "2%");
        var larger = drif(20, A, "4%");
        larger.setSize(DRIF_SIZE.ARCYDRIF);
        larger.setIncrement("1%");
        var fixture =
                fixture(List.of(item(1, ITEM_CATEGORY.HELMET, "X", 16, 0)), List.of(owned, larger));
        var original = slot(1, 1, 10L);
        original.setDrifLevels(Map.of("0", 6));
        var request = request(A, Map.of("helmet", original));
        request.getAdvisor().getAllowedChanges().setDrifUpgrades(true);
        request.getAdvisor().setStrategy(AdvisorOptions.Strategy.BEST_RESULT);

        var result = fixture.service.optimize(request);

        assertEquals(
                List.of(20L), result.getOptimizedSetup().getSlots().get("helmet").getDrifIds());
        assertEquals(
                21, result.getOptimizedSetup().getSlots().get("helmet").getDrifLevels().get("0"));
        assertEquals(1, result.getAdvisorReport().plans().getFirst().drifCounts().get(A.name()));
        assertEquals(
                fixture.calculator.calculateWithSources(result.getOptimizedSetup()),
                result.getCalculationResult());
    }

    @ParameterizedTest
    @ValueSource(strings = {"disabled", "slotLock", "drifLock", "tier"})
    void respectsTheExistingToggleLocksAndTier(String restriction) {
        var larger = drif(20, A, "4%");
        larger.setSize(DRIF_SIZE.BIDRIF);
        var fixture =
                fixture(
                        List.of(
                                item(
                                        1,
                                        ITEM_CATEGORY.HELMET,
                                        restriction.equals("tier") ? "I" : "IV",
                                        4,
                                        0)),
                        List.of(drif(10, A, "2%"), larger, drif(30, B, "50%")));
        var original = slot(1, 1, 10L);
        original.setDrifLevels(Map.of("0", 6));
        var request = request(A, Map.of("helmet", original));
        request.getAdvisor().getAllowedChanges().setDrifUpgrades(!restriction.equals("disabled"));
        if (restriction.equals("slotLock")) request.setLockedSlots(Set.of("helmet"));
        if (restriction.equals("drifLock")) request.setLockedDrifs(Map.of("helmet", Set.of(0)));

        var result = fixture.service.optimize(request);

        assertTrue(result.getAdvisorReport().plans().isEmpty());
        assertEquals(
                List.of(10L), result.getOptimizedSetup().getSlots().get("helmet").getDrifIds());
        assertEquals(
                6, result.getOptimizedSetup().getSlots().get("helmet").getDrifLevels().get("0"));
    }

    @Test
    void sizeUpgradeImprovesNegativeModifiersInTheCorrectDirection() {
        var type = DRIF_BONUS_TYPE.MANA_USAGE_REDUCTION;
        var small = drif(10, type, "-2%");
        var large = drif(20, type, "-4%");
        large.setSize(DRIF_SIZE.BIDRIF);
        var fixture =
                fixture(List.of(item(1, ITEM_CATEGORY.HELMET, "IV", 8, 0)), List.of(small, large));
        var request = request(type, Map.of("helmet", slot(1, 1, 10L)));
        request.getAdvisor().getAllowedChanges().setDrifUpgrades(true);

        var result = fixture.service.optimize(request);

        assertEquals(
                List.of(20L), result.getOptimizedSetup().getSlots().get("helmet").getDrifIds());
        assertEquals(2.0, result.getSummary().getNextVariants().getFirst().gain(), 0.0001);
        assertEquals(
                fixture.calculator.calculateWithSources(result.getOptimizedSetup()),
                result.getCalculationResult());
    }

    @Test
    void doesNotResizeOrRaiseBuiltInDrifs() {
        var weapon = item(1, ITEM_CATEGORY.WEAPON_2H, "VII", 0, 0);
        weapon.setName("Gorthdar");
        weapon.setRarity(RARITY.EPIC);
        var fire = drif(10, DRIF_BONUS_TYPE.DAMAGE_FIRE, "2%");
        fire.setSize(DRIF_SIZE.MAGNIDRIF);
        var critical = drif(20, A, "2%");
        critical.setSize(DRIF_SIZE.MAGNIDRIF);
        var larger = drif(30, A, "4%");
        larger.setSize(DRIF_SIZE.ARCYDRIF);
        var fixture = fixture(List.of(weapon), List.of(fire, critical, larger));
        var original = slot(1, 1, 10L, 20L);
        var request = request(A, Map.of("weapon", original));
        request.getAdvisor().getAllowedChanges().setDrifUpgrades(true);

        var result = fixture.service.optimize(request);

        assertTrue(result.getSummary().isSuccess(), result.getSummary().getMessage());
        assertTrue(result.getAdvisorReport().plans().isEmpty());
        assertEquals(
                original.getDrifIds(),
                result.getOptimizedSetup().getSlots().get("weapon").getDrifIds());
    }

    @Test
    void findsAMoveBeforeResizingWhenTheOriginalTierCannotHoldTheUpgrade() {
        var larger = drif(20, A, "4%");
        larger.setSize(DRIF_SIZE.BIDRIF);
        var fixture =
                fixture(
                        List.of(
                                item(1, ITEM_CATEGORY.HELMET, "I", 4, 0),
                                item(2, ITEM_CATEGORY.BOOTS, "IV", 4, 0)),
                        List.of(drif(10, A, "2%"), larger));
        var helmet = slot(1, 1, 10L);
        helmet.setDrifLevels(Map.of("0", 6));
        var request = request(A, Map.of("helmet", helmet, "boots", slot(2, 1)));
        request.getAdvisor().getAllowedChanges().setDrifUpgrades(true);
        request.getAdvisor().setMaxActions(2);

        var result = fixture.service.optimize(request);

        assertEquals(List.of(20L), result.getOptimizedSetup().getSlots().get("boots").getDrifIds());
        var actions = result.getAdvisorReport().plans().getFirst().actionDetails();
        assertEquals(2, actions.size());
        assertEquals(AdvisorAction.Type.MOVE, actions.getFirst().type());
        assertEquals(AdvisorAction.Type.UPGRADE_DRIF, actions.getLast().type());
        assertEquals("initial:helmet:0", actions.getLast().drifs().getFirst().identity());
        assertEquals(10L, actions.getLast().drifs().getFirst().fromDrifId());
        assertEquals(20L, actions.getLast().drifs().getFirst().drifId());
    }

    @Test
    void mergesSizeAndLevelUpgradesAcrossAMoveIntoAnExecutablePlan() {
        var small = drif(10, A, "2%");
        var medium = drif(20, A, "4%");
        medium.setSize(DRIF_SIZE.BIDRIF);
        var large = drif(30, A, "6%");
        large.setSize(DRIF_SIZE.ARCYDRIF);
        var helmet = slot(1, 1, 10L);
        helmet.setDrifLevels(Map.of("0", 6));
        var original = Map.of("helmet", helmet, "boots", slot(2, 1));
        var request = request(A, original);
        var model =
                model(
                        List.of(
                                item(1, ITEM_CATEGORY.HELMET, "IV", 4, 0),
                                item(2, ITEM_CATEGORY.BOOTS, "X", 12, 0)),
                        List.of(small, medium, large),
                        request);
        var search =
                new AdvisorSearch(
                        model,
                        request.getAdvisor(),
                        model.evaluate(original),
                        Long.MAX_VALUE,
                        new AtomicBoolean());
        var factory = new AdvisorNodeFactory(search);
        var initial =
                new AdvisorSearch.Node(
                        original, model.evaluate(original), List.of(), Set.of(), 0, 0);
        var raised = new LinkedHashMap<>(original);
        raised.put("helmet", AdvisorSlotData.placed(helmet, 0, 20L, 6));
        var upgraded = factory.child(initial, raised, new AdvisorChangeKey.Drif("helmet", 0), 1, 0);
        var movedSlots = new LinkedHashMap<>(raised);
        movedSlots.put("helmet", AdvisorSlotData.placed(raised.get("helmet"), 0, null, 1));
        movedSlots.put("boots", AdvisorSlotData.placed(original.get("boots"), 0, 20L, 6));
        var moved = factory.child(upgraded, movedSlots, 0, 0);
        var finalSlots = new LinkedHashMap<>(movedSlots);
        finalSlots.put("boots", AdvisorSlotData.placed(movedSlots.get("boots"), 0, 30L, 16));
        var result = factory.child(moved, finalSlots, new AdvisorChangeKey.Drif("boots", 0), 1, 10);

        assertEquals(2, result.actions().size());
        assertEquals(1, result.upgrades());
        assertEquals(10, result.effort());
        var move = result.actionDetails().getFirst();
        var upgrade = result.actionDetails().getLast();
        assertEquals(AdvisorAction.Type.MOVE, move.type());
        assertEquals(10L, move.drifs().getFirst().drifId());
        assertEquals(6, move.drifs().getFirst().toLevel());
        assertEquals(10L, upgrade.drifs().getFirst().fromDrifId());
        assertEquals(30L, upgrade.drifs().getFirst().drifId());
        assertEquals("initial:helmet:0", upgrade.drifs().getFirst().identity());
        var replayed = new LinkedHashMap<>(original);
        for (var action : result.actionDetails()) {
            for (var stone : action.drifs()) {
                assertEquals(
                        stone.fromDrifId(),
                        AdvisorSlotData.id(
                                replayed.get(stone.from().slotKey()), stone.from().socketIndex()));
                assertEquals(
                        stone.fromLevel(),
                        AdvisorSlotData.level(
                                replayed.get(stone.from().slotKey()), stone.from().socketIndex()));
                replayed.put(
                        stone.from().slotKey(),
                        AdvisorSlotData.placed(
                                replayed.get(stone.from().slotKey()),
                                stone.from().socketIndex(),
                                null,
                                1));
                replayed.put(
                        stone.to().slotKey(),
                        AdvisorSlotData.placed(
                                replayed.get(stone.to().slotKey()),
                                stone.to().socketIndex(),
                                stone.drifId(),
                                stone.toLevel()));
            }
            assertTrue(model.valid(replayed));
        }
        assertEquals(AdvisorSlotData.signature(finalSlots), AdvisorSlotData.signature(replayed));
    }
}
