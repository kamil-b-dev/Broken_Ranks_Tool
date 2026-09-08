package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import java.util.Comparator;
import java.util.function.Predicate;
import java.util.function.ToDoubleFunction;

/** Orders advisor plans by target fulfillment, effect, and amount of intervention. */
final class AdvisorPlanRanking {
    private AdvisorPlanRanking() {}

    static Comparator<AdvisorSearch.Node> create(
            double target,
            Predicate<AdvisorSearch.Node> reached,
            ToDoubleFunction<AdvisorSearch.Node> value) {
        return (left, right) -> {
            if (Double.isFinite(target)) {
                int targetOrder = Boolean.compare(reached.test(right), reached.test(left));
                if (targetOrder != 0) return targetOrder;
                if (reached.test(left) && reached.test(right)) {
                    int cost = compareCost(left, right);
                    if (cost != 0) return cost;
                }
            }
            int effect = Double.compare(value.applyAsDouble(right), value.applyAsDouble(left));
            return effect != 0 ? effect : compareCost(left, right);
        };
    }

    private static int compareCost(AdvisorSearch.Node left, AdvisorSearch.Node right) {
        int result = Integer.compare(left.upgrades(), right.upgrades());
        if (result == 0) result = Integer.compare(left.effort(), right.effort());
        if (result == 0) result = Integer.compare(left.actions().size(), right.actions().size());
        return result;
    }
}
