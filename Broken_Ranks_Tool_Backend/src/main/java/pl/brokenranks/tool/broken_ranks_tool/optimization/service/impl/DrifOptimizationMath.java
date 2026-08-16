package pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl;

import lombok.experimental.UtilityClass;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;

import java.util.List;
import java.util.Objects;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.service.impl.OptimizationSearchModel.*;

/** Capacity, level, power, and value calculations used by the optimizer. */
@UtilityClass
class DrifOptimizationMath {

    static Integer highestFittingLevel(BuildState state, SlotContext slot, DrifTemplate drif) {
        int remaining = slot.capacity() - usedPower(state.slots.get(slot.key()));
        if (remaining < drif.getBonusType().getBasePower()) return null;
        return highestLevelForPower(drif, remaining);
    }

    static Integer lowestTierFittingLevel(BuildState state, SlotContext slot, DrifTemplate drif) {
        int remaining = slot.capacity() - usedPower(state.slots.get(slot.key()));
        if (remaining < drif.getBonusType().getBasePower()) return null;
        return Math.min(6, drif.getSize().getMaxLevel());
    }

    static int highestLevelForPower(DrifTemplate drif, int availablePower) {
        int affordableMultiplier = Math.max(1,
                Math.min(4, availablePower / Math.max(1, drif.getBonusType().getBasePower())));
        int sizeMultiplier = effectiveMultiplier(drif.getSize().getMaxLevel());
        int multiplier = Math.min(affordableMultiplier, sizeMultiplier);
        return switch (multiplier) {
            case 1 -> Math.min(6, drif.getSize().getMaxLevel());
            case 2 -> Math.min(11, drif.getSize().getMaxLevel());
            case 3 -> Math.min(16, drif.getSize().getMaxLevel());
            default -> drif.getSize().getMaxLevel();
        };
    }

    static boolean fitsCapacity(List<Placement> placements, SlotContext slot) {
        return usedPower(placements) <= slot.capacity();
    }

    static int usedPower(List<Placement> placements) {
        return placements.stream().filter(Objects::nonNull)
                .mapToInt(placement -> power(placement.drif(), placement.level()))
                .sum();
    }

    static int countPlaced(List<Placement> placements) {
        return (int) placements.stream().filter(Objects::nonNull).count();
    }

    static int usedPowerExcept(List<Placement> placements, int ignoredIndex) {
        int power = 0;
        for (int index = 0; index < placements.size(); index++) {
            if (index != ignoredIndex && placements.get(index) != null) {
                power += power(placements.get(index).drif(), placements.get(index).level());
            }
        }
        return power;
    }

    static int power(DrifTemplate drif, int level) {
        return drif.getBonusType().getBasePower() * effectiveMultiplier(level);
    }

    static int effectiveMultiplier(int level) {
        if (level <= 6) return 1;
        if (level <= 11) return 2;
        if (level <= 16) return 3;
        return 4;
    }

    static double calculateDrifValue(DrifTemplate drif, int level) {
        if (drif.getBaseValue() == null || drif.getIncrement() == null) return 0.0;
        try {
            double total = Double.parseDouble(drif.getBaseValue().replace("%", "")
                    .replace(",", ".").trim());
            double increment = Double.parseDouble(drif.getIncrement().replace("%", "")
                    .replace(",", ".").trim());
            for (int current = 2; current <= level; current++) {
                total += current >= 19 && current <= 21 ? increment * 2 : increment;
            }
            return total;
        } catch (NumberFormatException exception) {
            return 0.0;
        }
    }
}
