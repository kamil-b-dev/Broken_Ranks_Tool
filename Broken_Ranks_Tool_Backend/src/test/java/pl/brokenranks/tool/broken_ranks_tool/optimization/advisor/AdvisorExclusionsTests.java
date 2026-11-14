package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import static org.junit.jupiter.api.Assertions.*;

import java.util.*;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.*;

class AdvisorExclusionsTests extends AdvisorOptimizationTestSupport {
    @Test
    void preservesExplicitSynergeticsInTheBaselineAndEveryReturnedSetup() {
        var fixture =
                fixture(
                        List.of(item(1, ITEM_CATEGORY.HELMET, "IV", 8, 0)),
                        List.of(drif(10, A, "2%")));
        var custom =
                new pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest.SlotData();
        custom.setSynergetic(
                new pl.brokenranks.tool.broken_ranks_tool.equipment.dto.EquipmentRequest
                        .SynergeticItem("Res", Map.of("PŻ", 100)));
        var input = request(A, Map.of("helmet", slot(1, 1, 10L), "ring1", custom));
        input.getAdvisor().getAllowedChanges().setDrifUpgrades(true);
        var result = fixture.service.optimize(input);
        assertTrue(result.getSummary().isSuccess());
        assertEquals(
                custom.getSynergetic(),
                result.getOptimizedSetup().getSlots().get("ring1").getSynergetic());
        assertEquals("100", result.getCalculationResult().stats().get("PŻ"));
    }

    @Test
    void excludedPurchaseTypeDoesNotPreventUpgradingAnOwnedDrif() {
        var fixture =
                fixture(
                        List.of(item(1, ITEM_CATEGORY.HELMET, "IV", 8, 0)),
                        List.of(drif(10, A, "2%")));
        var input = request(A, Map.of("helmet", slot(1, 1, 10L)));
        input.getAdvisor().getAllowedChanges().setDrifs(true);
        input.getAdvisor().getAllowedChanges().setDrifUpgrades(true);
        input.getAdvisor().setExcludedPurchaseBonusTypes(Set.of(A));
        var result = fixture.service.optimize(input);
        assertTrue(result.getSummary().isSuccess());
        assertEquals(
                1,
                result.getOptimizedSetup().getSlots().get("helmet").getDrifIds().stream()
                        .filter(Objects::nonNull)
                        .count());
        assertTrue(
                result.getAdvisorReport().plans().stream()
                        .flatMap(plan -> plan.actionDetails().stream())
                        .noneMatch(
                                action ->
                                        action.type()
                                                == pl.brokenranks.tool.broken_ranks_tool
                                                        .optimization.dto.AdvisorAction.Type
                                                        .PURCHASE_DRIF));
    }

    @Test
    void filtersExcludedItemsBeforeChoosingTheLargestCapacityFrontier() {
        var fixture =
                fixture(
                        List.of(
                                item(1, ITEM_CATEGORY.HELMET, "IV", 4, 0),
                                item(2, ITEM_CATEGORY.HELMET, "IV", 8, 50),
                                item(3, ITEM_CATEGORY.HELMET, "IV", 6, 25)),
                        List.of(drif(10, A, "2%")));
        var input = request(A, Map.of("helmet", slot(1, 1, 10L)));
        input.getAdvisor().getAllowedChanges().setItems(true);
        input.getAdvisor().setExcludedItemIds(Set.of(2L));
        var result = fixture.service.optimize(input);
        assertTrue(result.getSummary().isSuccess());
        assertEquals(3L, result.getOptimizedSetup().getSlots().get("helmet").getItemId());
    }
}
