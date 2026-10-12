package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import static org.junit.jupiter.api.Assertions.*;

import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.*;
import pl.brokenranks.tool.broken_ranks_tool.optimization.dto.*;

class AdvisorActionTests extends AdvisorOptimizationTestSupport {
    @Test
    void repeatedUpgradesAcrossAMoveUseTwoExecutableActionsAndOneUpgradeCost() {
        var helmet = item(1, ITEM_CATEGORY.HELMET, "VII", 4, 0);
        var boots = item(2, ITEM_CATEGORY.BOOTS, "VII", 12, 0);
        var stone = drif(10, A, "2%");
        stone.setSize(DRIF_SIZE.MAGNIDRIF);
        var original = Map.of("helmet", slot(1, 1, 10L), "boots", slot(2, 1));
        var request = request(A, original);
        var model = model(List.of(helmet, boots), List.of(stone), request);
        var search =
                new AdvisorSearch(
                        model,
                        request.getAdvisor(),
                        model.evaluate(original),
                        Long.MAX_VALUE,
                        new java.util.concurrent.atomic.AtomicBoolean());
        var nodes = new AdvisorNodeFactory(search);
        var initial =
                new AdvisorSearch.Node(
                        original, model.evaluate(original), List.of(), Set.of(), 0, 0);
        var raised = new java.util.LinkedHashMap<>(original);
        raised.put("helmet", AdvisorSlotData.placed(original.get("helmet"), 0, 10L, 6));
        var upgraded = nodes.child(initial, raised, new AdvisorChangeKey.Drif("helmet", 0), 1, 5);
        var movedSlots = new java.util.LinkedHashMap<>(raised);
        movedSlots.put("helmet", AdvisorSlotData.placed(raised.get("helmet"), 0, null, 1));
        movedSlots.put("boots", AdvisorSlotData.placed(original.get("boots"), 0, 10L, 6));
        var moved = nodes.child(upgraded, movedSlots, 0, 0);
        var finalSlots = new java.util.LinkedHashMap<>(movedSlots);
        finalSlots.put("boots", AdvisorSlotData.placed(movedSlots.get("boots"), 0, 10L, 16));
        var finalNode =
                nodes.child(moved, finalSlots, new AdvisorChangeKey.Drif("boots", 0), 1, 10);
        assertEquals(2, finalNode.actions().size());
        assertEquals(1, finalNode.upgrades());
        assertEquals(15, finalNode.effort());
        assertEquals(AdvisorAction.Type.MOVE, finalNode.actionDetails().getFirst().type());
        assertEquals(1, finalNode.actionDetails().getFirst().drifs().getFirst().toLevel());
        var finalUpgrade = finalNode.actionDetails().getLast().drifs().getFirst();
        assertEquals("initial:helmet:0", finalUpgrade.identity());
        assertEquals(1, finalUpgrade.fromLevel());
        assertEquals(16, finalUpgrade.toLevel());
        assertTrue(model.valid(finalSlots));
        // The report moves level 1 first, then upgrades in boots; level 16 would not fit the
        // helmet.
        var intermediate = Map.of("helmet", slot(1, 1), "boots", slot(2, 1, 10L));
        assertTrue(model.valid(intermediate));
        assertTrue(finalNode.actions().getFirst().contains(" 1 z "));
        assertTrue(finalNode.actions().getLast().endsWith("do poziomu 16"));
    }

    @Test
    void identicalTemplateIdsKeepSeparateOccurrenceIdentitiesWhenSwapped() {
        var helmet = slot(1, 1, 10L);
        var boots = slot(2, 1, 10L);
        boots.setDrifLevels(Map.of("0", 6));
        var original =
                new AdvisorSearch.Node(
                        Map.of("helmet", helmet, "boots", boots), null, List.of(), Set.of(), 0, 0);
        var after =
                Map.of(
                        "helmet",
                        AdvisorSlotData.placed(helmet, 0, 10L, 6),
                        "boots",
                        AdvisorSlotData.placed(boots, 0, 10L, 1));
        AdvisorAction action = new AdvisorActionFactory().create(original, after);
        assertEquals(AdvisorAction.Type.SWAP, action.type());
        assertEquals(
                Set.of("initial:helmet:0", "initial:boots:0"),
                action.drifs().stream()
                        .map(AdvisorAction.DrifChange::identity)
                        .collect(java.util.stream.Collectors.toSet()));
    }

    @Test
    void purchasesAndFurtherUpgradesKeepThePurchasedIdentity() {
        var original =
                new AdvisorSearch.Node(
                        Map.of("helmet", slot(1, 1)), null, List.of(), Set.of(), 0, 0);
        var boughtSlots = Map.of("helmet", slot(1, 1, 10L));
        var factory = new AdvisorActionFactory();
        var purchase = factory.create(original, boughtSlots);
        assertEquals(AdvisorAction.Type.PURCHASE_DRIF, purchase.type());
        var bought =
                new AdvisorSearch.Node(
                        boughtSlots, null, List.of("purchase"), Set.of(), 1, 1, List.of(purchase));
        var upgrade =
                factory.create(
                        bought,
                        Map.of(
                                "helmet",
                                AdvisorSlotData.placed(boughtSlots.get("helmet"), 0, 10L, 6)));
        assertEquals(purchase.drifs().getFirst().identity(), upgrade.drifs().getFirst().identity());
        assertThrows(
                IllegalArgumentException.class,
                () -> factory.create(bought, Map.of("helmet", slot(1, 1))));
        assertThrows(
                IllegalArgumentException.class, () -> factory.create(original, original.slots()));
    }
}
