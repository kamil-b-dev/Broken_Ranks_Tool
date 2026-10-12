package pl.brokenranks.tool.broken_ranks_tool.optimization.advisor;

import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.enums.*;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.rules.ModifierValueRules;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.ItemTemplate;

/** Removes only substitutions that cannot improve any supported statistic or later legal action. */
final class AdvisorItemDominance {
    private final AdvisorEquipmentModel model;

    AdvisorItemDominance(AdvisorEquipmentModel model) {
        this.model = model;
    }

    boolean dominates(
            ItemTemplate left, ItemTemplate right, int currentStars, boolean starChanges) {
        if (left == right || tier(left) < tier(right)) return false;
        boolean strictlyBetter = false;
        for (int stars = currentStars; stars <= (starChanges ? 9 : currentStars); stars++) {
            int leftCapacity = model.levels.calculateItemCapacity(left, stars);
            int rightCapacity = model.levels.calculateItemCapacity(right, stars);
            if (leftCapacity < rightCapacity
                    || model.placement.maxDrifs(left, stars)
                            < model.placement.maxDrifs(right, stars)) return false;
            double bonus = model.itemDrifBonus(left, stars) - model.itemDrifBonus(right, stars);
            if (bonus < -AdvisorSearch.EPSILON) return false;
            strictlyBetter |= leftCapacity > rightCapacity || bonus > AdvisorSearch.EPSILON;
            Map<String, Double> leftStats = model.itemValues(left, stars);
            Map<String, Double> rightStats = model.itemValues(right, stars);
            Set<String> keys = new HashSet<>(leftStats.keySet());
            keys.addAll(rightStats.keySet());
            for (String key : keys) {
                double delta =
                        directed(key, leftStats.getOrDefault(key, 0.0))
                                - directed(key, rightStats.getOrDefault(key, 0.0));
                if (delta < -AdvisorSearch.EPSILON) return false;
                strictlyBetter |= delta > AdvisorSearch.EPSILON;
            }
        }
        return strictlyBetter || left.getId() < right.getId();
    }

    private int tier(ItemTemplate item) {
        return item.getTier() == null ? 1 : ITEM_TIER.levelOf(item.getTier());
    }

    private double directed(String key, double value) {
        for (DRIF_BONUS_TYPE type : DRIF_BONUS_TYPE.values()) {
            if (type.name().equalsIgnoreCase(key) || type.getDescription().equalsIgnoreCase(key))
                return ModifierValueRules.directed(type, value);
        }
        return value;
    }
}
