package pl.brokenranks.tool.broken_ranks_tool.optimization.engine.rules;

import static pl.brokenranks.tool.broken_ranks_tool.optimization.engine.model.OptimizationSearchModel.*;

import java.util.List;
import java.util.Objects;
import lombok.experimental.UtilityClass;
import pl.brokenranks.tool.broken_ranks_tool.equipment.domain.util.DrifPowerRules;
import pl.brokenranks.tool.broken_ranks_tool.equipment.entity.templates.DrifTemplate;

/** Capacity, level, power, and value calculations used by the optimizer. */
@UtilityClass
public class DrifOptimizationMath {

    public static Integer highestFittingLevel(
            BuildState state, SlotContext slot, DrifTemplate drif) {
        int remaining = slot.capacity() - usedPower(state.slots().get(slot.key()));
        if (remaining < drif.getBonusType().getBasePower()) return null;
        return highestLevelForPower(drif, remaining);
    }

    public static Integer lowestTierFittingLevel(
            BuildState state, SlotContext slot, DrifTemplate drif) {
        int remaining = slot.capacity() - usedPower(state.slots().get(slot.key()));
        if (remaining < drif.getBonusType().getBasePower()) return null;
        return Math.min(6, drif.getSize().getMaxLevel());
    }

    public static int highestLevelForPower(DrifTemplate drif, int availablePower) {
        int affordableMultiplier =
                Math.max(
                        1,
                        Math.min(
                                4,
                                availablePower / Math.max(1, drif.getBonusType().getBasePower())));
        int sizeMultiplier = DrifPowerRules.effectiveMultiplier(drif.getSize().getMaxLevel());
        int multiplier = Math.min(affordableMultiplier, sizeMultiplier);
        return switch (multiplier) {
            case 1 -> Math.min(6, drif.getSize().getMaxLevel());
            case 2 -> Math.min(11, drif.getSize().getMaxLevel());
            case 3 -> Math.min(16, drif.getSize().getMaxLevel());
            default -> drif.getSize().getMaxLevel();
        };
    }

    public static boolean fitsCapacity(List<Placement> placements, SlotContext slot) {
        return usedPower(placements) <= slot.capacity();
    }

    public static int usedPower(List<Placement> placements) {
        return placements.stream()
                .filter(Objects::nonNull)
                .mapToInt(placement -> power(placement.drif(), placement.level()))
                .sum();
    }

    public static int countPlaced(List<Placement> placements) {
        return (int) placements.stream().filter(Objects::nonNull).count();
    }

    public static int usedPowerExcept(List<Placement> placements, int ignoredIndex) {
        int power = 0;
        for (int index = 0; index < placements.size(); index++) {
            if (index != ignoredIndex && placements.get(index) != null) {
                power += power(placements.get(index).drif(), placements.get(index).level());
            }
        }
        return power;
    }

    public static int power(DrifTemplate drif, int level) {
        return DrifPowerRules.power(drif.getBonusType().getBasePower(), level);
    }

    public static double calculateDrifValue(DrifTemplate drif, int level) {
        if (drif.getBaseValue() == null || drif.getIncrement() == null) return 0.0;
        try {
            double total = parseModifierNumber(drif.getBaseValue());
            double increment = parseModifierNumber(drif.getIncrement());
            for (int current = 2; current <= level; current++) {
                total += incrementForLevel(increment, current);
            }
            return total;
        } catch (NumberFormatException exception) {
            return 0.0;
        }
    }

    private double parseModifierNumber(String value) {
        return Double.parseDouble(value.replace("%", "").replace(",", ".").trim());
    }

    private double incrementForLevel(double increment, int level) {
        return level >= 19 && level <= 21 ? increment * 2 : increment;
    }
}
