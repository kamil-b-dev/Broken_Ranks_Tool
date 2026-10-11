package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import static org.junit.jupiter.api.Assertions.*;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.*;

class AdvisorItemDominanceTests extends AdvisorOptimizationTestSupport {
    @Test
    void retainsStatisticalTradeoffsAndPrefersAnOtherwiseEqualHigherDrifBonus() {
        var first = item(1, ITEM_CATEGORY.HELMET, "X", 12, 10);
        var second = item(2, ITEM_CATEGORY.HELMET, "X", 12, 0);
        var stronger = item(3, ITEM_CATEGORY.HELMET, "X", 12, 20);
        first.setStats(Map.of("Bonus drify", 10.0, "Siła", 2.0));
        second.setStats(Map.of("Bonus drify", 0.0, "Wiedza", 2.0));
        stronger.setStats(Map.of("Bonus drify", 20.0, "Siła", 2.0));
        var dominance =
                new AdvisorItemDominance(
                        model(
                                List.of(first, second, stronger),
                                List.of(),
                                request(A, Map.of("helmet", slot(1, 1)))));
        assertFalse(dominance.dominates(first, second, 1, true));
        assertFalse(dominance.dominates(second, first, 1, true));
        assertTrue(dominance.dominates(stronger, first, 1, true));
        assertFalse(dominance.dominates(first, stronger, 1, true));
    }

    @Test
    void starBonusDistributionCanPreventDominanceEvenWhenBaseStatsAreNoWorse() {
        var first = item(1, ITEM_CATEGORY.HELMET, "X", 12, 0);
        var second = item(2, ITEM_CATEGORY.HELMET, "X", 12, 0);
        first.setStats(Map.of("Siła", 1.0, "Zręczność", 2.0));
        second.setStats(Map.of("Zręczność", 2.0));
        var dominance =
                new AdvisorItemDominance(
                        model(
                                List.of(first, second),
                                List.of(),
                                request(A, Map.of("helmet", slot(1, 1)))));
        assertTrue(dominance.dominates(first, second, 1, false));
        assertFalse(dominance.dominates(first, second, 1, true));
    }

    @Test
    void lowerTierOrCapacityCannotRemoveALegalFutureChoiceAndExactTiesAreStable() {
        var high = item(1, ITEM_CATEGORY.HELMET, "X", 12, 10);
        var lowTier = item(2, ITEM_CATEGORY.HELMET, "IX", 12, 20);
        var lowCapacity = item(3, ITEM_CATEGORY.HELMET, "X", 8, 20);
        var equal = item(4, ITEM_CATEGORY.HELMET, "X", 12, 10);
        var dominance =
                new AdvisorItemDominance(
                        model(
                                List.of(high, lowTier, lowCapacity, equal),
                                List.of(),
                                request(A, Map.of("helmet", slot(1, 1)))));
        assertFalse(dominance.dominates(lowTier, high, 1, true));
        assertFalse(dominance.dominates(lowCapacity, high, 1, true));
        assertTrue(dominance.dominates(high, equal, 1, true));
        assertFalse(dominance.dominates(equal, high, 1, true));
    }
}
